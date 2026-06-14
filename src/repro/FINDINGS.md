# 検証: vitest `isolate: false` + testing-library/react + workspace

vitest 1.6.1 / happy-dom 15 / @testing-library/react 14 のこのリポジトリ上で、
「`isolate: false` がうまくいかない（DOM/状態がリークする・ハングする）」事象を再現・検証した結果。

実行コマンド: `pnpm exec vitest run --no-file-parallelism`
（`--no-file-parallelism` は全ファイルを単一ワーカーで逐次実行させ、ファイル横断のリークを観測しやすくするため）

## 再現環境

- `vitest.workspace.ts` … workspace プロジェクト `repro` を定義。`environment` / `setupFiles` のみ指定し、
  ルート `vite.config.ts` の `test.globals: true` は**意図的に書いていない**。`isolate: false` を指定。
- `src/repro/leak/test.tsx` … 症状A（DOM リーク）
- `src/repro/hang/`（`Ticker.tsx` + `test.tsx`）… 症状B（状態/リソースリーク）
- `src/repro/shared/`（`counter.ts` + `a/test.tsx` + `b/test.tsx`）… `isolate:false` の効き目検証

## 結論（根本原因は2つ）

### 原因1: workspace プロジェクトはルートの `globals`/`environment`/`setupFiles` を継承しない → 自動 cleanup が止まる（症状A・B の主因）

@testing-library/react の自動 cleanup は、import 時に**グローバルな `afterEach` が存在する場合だけ** `afterEach(cleanup)` を登録する。
workspace のプロジェクト設定はルート `vite.config.ts` の `test.globals: true` を**自動継承しない**ため、
プロジェクト側で `globals` を書き忘れると自動 cleanup が静かに無効化される。

- `globals` 無し（再現状態）: `leak/test.tsx` の2つ目の `it` で
  `TestingLibraryElementError: Found multiple elements with the text: Hello World` → **DOM がリーク**。
- workspace プロジェクトに `globals: true` を明示すると → `leak/test.tsx` は **PASS**（自動 cleanup 復活）。

cleanup が走らないと、`hang/Ticker.tsx` の `setInterval` も解放されず未クローズ timer が残り、
状態が累積してテスト数が増えるとワーカーが終了できずハング/不安定化する（症状B）。

### 原因2: `vitest.workspace.ts` のプロジェクトに書いた `isolate: false` は効かない（無視される）

`src/repro/shared/`（`globalThis` 上の共有カウンタを2ファイルから increment）で、構成ごとの挙動を比較:

| 構成 | クロスファイルのグローバル状態 | 判定 |
|---|---|---|
| workspace に `isolate: false`（config のみ） | リークしない（PASS） | **isolate:false が無視されている** |
| workspace + CLI `--no-isolate` | リークする（`expected 2 to be 1` で FAIL） | CLI 経由なら効く |
| ルート設定 `--config vite.config.ts` + `--no-isolate` | リークする | ルート設定なら効く |
| ルート設定 + 既定（isolate:true） | リークしない | 期待通り |

→ **`isolate: false` を workspace プロジェクトの `test` に書いても適用されない**。
CLI の `--no-isolate`、またはルートの `test` 設定に書く必要がある。
「workspace を併用すると isolate:false がうまくいかない」の正体はこれ。

## 回避策

1. workspace プロジェクトには `globals: true`（および `environment` / `setupFiles`）を**明示**する。
   または `setupFiles` で `import { afterEach } from 'vitest'` + `afterEach(cleanup)` を手動登録し、globals 非依存にする。
2. `isolate: false` は workspace プロジェクトの `test` に書かず、**CLI `--no-isolate`** か**ルートの `test` 設定**で指定する。
3. cleanup が確実に走るようにした上で、`setInterval` 等は必ず `useEffect` の戻り値で `clearInterval` する
   （isolate:false ではリソースリークがファイルをまたいで効くため特に重要）。

## 追加検証: 汚染ベクタ probe マトリクス（`src/repro/probe/`）

「どの種類の状態が cross-file で漏れるか」を網羅的に実測した結果（`pnpm exec vitest run --no-isolate --no-file-parallelism src/repro/probe/<vector>`）。
**全ての漏れは `isolate: true`（既定）では消える**（gprop / modsingleton で確認済み）。

| 汚染ベクタ | isolate:false で漏れる? | 理由 |
|---|---|---|
| globalThis 素プロパティ（gprop） | ✅ 漏れる | global は worker に永続 |
| window 素プロパティ（winprop） | ✅ 漏れる | `window===globalThis`（同一の永続オブジェクト） |
| module singleton（modsingleton） | ✅ 漏れる（isolate:false 固有） | isolate:false はモジュールキャッシュを共有＝ファイル境界で再評価しない |
| process.env 直代入（procenv） | ✅ 漏れる | Node の process.env は永続（unstubEnvs 対象外） |
| vi.stubGlobal（stubglobal） | ✅ 漏れる | global への素プロパティ追加。unstubGlobals 未設定で未復元 |
| Object.defineProperty(global)（defineprop） | ✅ 漏れる | spy でないので restoreMocks 対象外 |
| vi.useFakeTimers 未復元（faketimers） | ✅ 漏れる | global タイマー関数差し替え。useRealTimers しないと残る |
| window/globalThis の event listener（winlistener/gtlistener） | ❌ 漏れない | happy-dom がファイル毎に listener 登録を初期化 |
| vi.spyOn(globalThis,'requestAnimationFrame')（spyraf） | ❌ 漏れない | rAF は window 組み込みメソッド→ファイル毎に再インストールされ spy が消える |
| document.body の DOM 残留（domresidue） | ❌ 漏れない | document がファイル毎に作り直される |
| vi.mock(factory) の適用（vimock） | ❌ 漏れない | vitest は vi.mock をファイル単位で適用（隣接の real import に汚染されない） |

### 貫く原理
- **漏れる＝「Node worker に永続するもの」**: global オブジェクトの素プロパティ／共有モジュールキャッシュ（isolate:false の本質）／process.env／Node のタイマー globals。
- **漏れない＝「happy-dom がファイル毎に初期化するもの」**: document・DOM・window 組み込みメソッド・イベントリスナー登録、および vitest がファイル単位で管理する vi.mock レジストリ。

### 注意（バージョン差）
event listener / requestAnimationFrame がこの repo（happy-dom 15 / vitest 1.6）で「漏れない側」なのは環境がファイル毎に初期化するため。
happy-dom / vitest のバージョンによっては listener が「漏れる側」に入ることがある（その場合は setup の global afterEach で listener 撤去・`vi.useRealTimers()` 等の明示 teardown が必要）。

## 追加検証: module singleton の「漏れる→fresh-per-test で直る」実証（`src/repro/singleton/`）

実アプリで最大の汚染源になる **module-level singleton の状態**（jotai のストア / react-query の QueryClient）を、
「共有版＝漏れる」と「test 毎 fresh 版＝漏れない」で対比実証した。`--no-file-parallelism` で同居を強制。

| ケース | isolate:true | isolate:false |
|---|---|---|
| jotai `getDefaultStore()` 共有（jotai-leak） | PASS | **FAIL（漏れる）** |
| jotai test 毎 `createStore()`（jotai-fix） | — | **PASS** |
| react-query module-level `new QueryClient()` 共有（rq-leak） | PASS | **FAIL（漏れる）** |
| react-query test 毎 `new QueryClient()`（rq-fix） | — | **PASS** |

### 結論
- module singleton の状態は isolate:false でファイル間に漏れる（jotai デフォルトストア・module-level QueryClient キャッシュ）。
- ただし **test 毎に fresh インスタンス（jotai は `createStore()`、react-query は `new QueryClient()`）にすれば
  isolate:false のままでも漏れない**。→ 「isolate:false で全テストを安定させる」ことは、共有 singleton を排除すれば
  本丸ベクタでも到達可能、と実証された。
- 実プロジェクトへの適用: SUT が module-level の `queryClient`（`getQueryData`/`setQueryData`）や jotai デフォルトストアを
  参照していないか確認し、テスト毎の fresh インスタンスを SUT に届ける形へ直す。
