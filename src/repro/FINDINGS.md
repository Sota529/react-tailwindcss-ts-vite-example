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

## 実プロジェクト（Copernicus）との対応 — 原因1・原因2 は該当しない

確認した Copernicus の構成: **`vitest.workspace.ts` 使用 / `globals: true`（project 側）/ `isolate: false` はルート `vite.config.ts` の `test`**。
この構成を本 repo で正確に再現し（実ファイルを一時差し替え→素の `vitest` で自動検出）、`shared/`（globalThis 横断カウンタ＝isolate 検出器）で `isolate:false` の効き場所を実測した。

| `isolate: false` の置き場所 | workspace テストへの適用 | shared 検出器の実測 |
|---|---|---|
| workspace **project** の `test` | **無視される**（`isolate` は root-only オプション） | PASS（漏れない＝適用されていない） |
| **ルート** `vite.config.ts` の `test` | **適用される** | FAIL（漏れる＝isolate:false 有効） |
| CLI `--no-isolate` | 適用される | FAIL（漏れる） |

→ **Copernicus は `isolate: false` をルートに書いており、workspace テストに実際に適用されている**（＝意図通り isolate:false で走っている）。かつ `globals: true` で testing-library の自動 cleanup も有効。

したがって本ドキュメント前半の2原因は **Copernicus には当てはまらない**:
- **原因1（workspace が globals 未継承→自動 cleanup 無効化）→ 該当しない**。Copernicus は `globals: true`。
- **原因2（`isolate` を workspace project に書くと無視）→ 該当しない**。Copernicus はルートに正しく配置済み。
  （※ 原因1・原因2 は私の repro が「globals 省略 / isolate を project に記述」という典型ミスを意図的に作って観測したアーティファクトであり、Copernicus はどちらも回避できている。）

### Copernicus の不安定さの真因候補
cleanup も `isolate:false` も「正しく」効いている以上、残る原因は **cleanup では消えない「Node worker に永続する状態」ベクタ**に絞られる（上の probe マトリクス／singleton セクションがそのまま該当）:
1. **module singleton**（jotai デフォルトストア / module-level `QueryClient`）← 実アプリ最大の汚染源。singleton セクションで「漏れる→ test 毎 fresh で直る」を実証済み。
2. fake timers 未復元（`vi.useRealTimers()` 漏れ）/ globalThis・window 素プロパティ / `process.env` 直代入 / `vi.stubGlobal` / `Object.defineProperty(global)`。

### 次アクション（Step 0: 実エラー採取）
Copernicus 側で対象テスト群を `--no-file-parallelism` で同居実行し、各 FAIL の**実エラー**を採取 → 下表のどのベクタに該当するか対応付ける → 表の処方箋を適用する。

### Copernicus 実構成での残存ベクタ実測（globals + clearMocks + restoreMocks + isolate:false）
Copernicus の追加設定 `clearMocks: true` / `restoreMocks: true` も込みで、本 repo の probe 全ベクタをペア同居実行（`--no-file-parallelism`）して「まだ漏れるか」を実測した。
**結論: `clearMocks`/`restoreMocks` が直したのは mock/spy 系だけ。永続状態ベクタは依然として全部漏れる。**

| ベクタ | clearMocks+restoreMocks のみ | +`unstubGlobals`/`unstubEnvs` | 処方箋 |
|---|---|---|---|
| `spyraf`（`vi.spyOn`） | ✅ PASS | ✅ | `restoreMocks` で解消済み |
| `vimock`（`vi.mock`） | ✅ PASS | ✅ | ファイル単位で再適用（リークしない） |
| `domresidue`（DOM 残留） | ✅ PASS | ✅ | `globals:true` の testing-library 自動 cleanup |
| `gtlistener`/`winlistener` | ✅ PASS | ✅ | （この構成では非リーク） |
| `stubglobal`（`vi.stubGlobal`） | ❌ FAIL | ✅ **PASS** | **`unstubGlobals: true` を追加**（restoreMocks では戻らない） |
| `procenv`（`process.env.X=` 直代入） | ❌ FAIL | ❌ FAIL | `unstubEnvs` は `vi.stubEnv` 専用。**直代入は `vi.stubEnv()` に書き換える**か手動復元 |
| `faketimers`（`vi.useFakeTimers`） | ❌ FAIL | ❌ FAIL | config フラグでは不可。**`afterEach(() => vi.useRealTimers())`**（setup で global 登録） |
| `modsingleton` / `jotai-leak` / `rq-leak` / `shared` | ❌ FAIL | ❌ FAIL | config 不可。**test 毎に fresh インスタンス**（`createStore()` / `new QueryClient()`、SUT へ注入） |
| `gprop`/`winprop`/`defineprop`（global/window 直書き） | ❌ FAIL | ❌ FAIL | config 不可。**global を直接汚さない**／setup で snapshot→`afterEach` 復元 |

→ Copernicus への具体処方:
1. config に **`unstubGlobals: true`**（できれば `unstubEnvs: true` も）を追加。`vi.stubGlobal`/`vi.stubEnv` 経由の汚染を一掃。
2. fake timers を使うテストは **`afterEach(() => vi.useRealTimers())`** を setup ファイルに global 登録。
3. module singleton（jotai デフォルトストア / module-level `QueryClient`）を **per-test fresh** 化し SUT に注入（最重要・config では直せない）。
4. `process.env` 直代入と global/window 直書きは、**`vi.stubEnv`/`vi.stubGlobal` 経由に統一**（→ 1 の自動復元に乗る）か、手動 teardown。

## Copernicus 動的採取レポートの検証 — `useRef` mock 仮説は再現せず（反証）

実プロジェクト側の動的採取レポートは、5ファイル中4ファイル（AsahiCampaign / paymentCompleteNotify / campaignRewardPoint / CartOrderButton）の `waitFor` timeout の真因を
「`setup.mock.ts` が `vi.doMock('react', () => react)` で `react.useRef = vi.fn()` にし、React Query の ref ベース状態追跡が壊れて re-render が発火しない」と推定していた。
これを `src/repro/rqhang/`（React18 + React Query v5 + RTL の `renderHook + waitFor` 最小ケース）で検証した結果、**この機序は再現しなかった**。

| 検証 | 結果 |
|---|---|
| `a/`: useRef mock なし・isolate:false 同居 | ✅ PASS（ハーネス健全性確認） |
| 文字どおりの `react.useRef = vi.fn()`（mutation） | ❌ `TypeError: Cannot redefine property: useRef` で **setup 自体が落ちる**（react の export は再定義不可）。レポート記載のコードはこのスタックでは実行不可 |
| `c/`: 正しいスプレッド mock `vi.mock('react', () => ({...actual, useRef: vi.fn()}))` で useRef が undefined を返す | ✅ **PASS（crash も timeout もしない）** |

理由: **reconciler が使う `useRef` は react-dom 内部実装**（共有 dispatcher 経由）であり、ユーザーランドの `React.useRef` mock の影響を受けない。
→ **「useRef mock が timeout を起こす」は反証。推奨修正#1（useRef mock 除去）は timeout を直さない公算が高い。**

### では真因は何か（採取データの再解釈）
採取された堅い観測 = 「`queryFn` は呼ばれる（calls:1）／`status: pending, fetchStatus: fetching`／`isFakeTimers: false`」。
これは **re-render 不発ではなく「queryFn が返す promise が co-resident 時に settle しない」**ことを示す。候補（要追加 instrumentation）:
- 先行ファイルが残した **fake timers**（promise 内部が `setTimeout` 依存なら microtask は進んでも settle しない）。観測点の `isFakeTimers:false` は当該テスト時点のみで、別ファイル由来の漏れを否定しきれない。
- spyOn ベースの `queryFn` mock が **`restoreMocks: true` で各テスト前に実装へ戻り**、2件目以降で実 API を叩いて pending（mock 設定が `beforeEach` の外にある場合）。
- module-level `QueryClient` / 共有 mock の状態汚染。
  - **campaignRewardPoint の `repo.get is mock: false`（spyOn インスタンス不一致）は採取どおり確定**。上の singleton/spy 分析と一致しており、これは真因として堅い。
- DrawerModal の fake timer 未復元併発も `faketimers` probe と整合。

### 次の instrumentation
`queryFn` mock 内で返す promise の identity と settle をログし、`QueryClient` のキャッシュ状態を直接読む。spyOn mock は `beforeEach` 内で再設定して `restoreMocks` との順序を確認する。useRef は容疑から外す。

## 真因2系統を harness で再現・確定（`src/repro/rqcross/`）

採取データの2つの容疑を最小ケースで再現・切り分けた。**いずれも「timeout」を生むが、シグネチャ（単独で落ちるか）が異なる**ため、どのファイルがどちらかを判別できる。

### (1) fake timers 残留 → RQ `waitFor` timeout  ✅再現
`rqcross/ftseq/test.tsx`: test1 が `vi.useFakeTimers()` を呼び戻さない → test2（`renderHook + waitFor`）が **Test timed out**。
- 機序: `queryFn`（`async () => 'OK'`）は microtask で resolve し query は内部的に success になるが、`waitFor` のポーリング/タイムアウトは**進まない fake timer**に乗るため再チェックされず hang。`clearMocks`/`restoreMocks` はタイマーを戻さない。
- **失敗テスト時点の `vi.isFakeTimers()` は `true`**（残留しているから）。→ 採取で `isFakeTimers:false` だったファイルは、純粋なこの機序では説明できない（観測タイミング差か、別ファイル由来の漏れか要確認）。
- DrawerModal（採取でも timer/RAF 帰属）はこの型。
- **処方（確認済み）**: setup に global `afterEach(() => vi.useRealTimers())` → test2 も PASS（`rqcross/setup.realtimers.ts`）。

### (2) `restoreMocks: true` × `beforeEach` 外の `spyOn` → `is mock: false` → timeout  ✅再現
`rqcross/rm-modlevel/test.tsx`（spy を module レベル）と `rm-beforeeach/test.tsx`（spy を `beforeEach`）を `restoreMocks:true` 単独実行で比較:

| spy の設置位置 | 1件目の `vi.isMockFunction(repo.get)` | 結果 |
|---|---|---|
| module / `describe` 直下 | **false**（各テスト前の `restoreAllMocks` が剥がす） | 実 API（never-resolve）→ **timeout（単独でも fail）** |
| `beforeEach` 内 | true（毎回再設定される） | PASS |

- この **`is mock: false` + timeout は採取の campaignRewardPoint と完全一致**。原因は「auto-mock との別インスタンス」より前に、**`restoreMocks:true` が `beforeEach` 外の spy を 1件目から剥がしている**こと（＝**単独でも落ちる**はず。campaignRewardPoint が単独で pass なら別機序＝`vi.resetModules()`+`await import` のインスタンス不一致が残る）。
- **処方**: `spyOn(...).mockResolvedValue(...)` を **`beforeEach` 内へ移す**、または `vi.mock('~/repositories', ...)` を明示宣言。

### 判別フロー（Copernicus 各ファイルへの当て方）
1. **単独でも timeout** → (2) 系（`restoreMocks` × spy 位置 or インスタンス不一致）。`is mock` を確認。
2. **単独 pass / 同居のみ timeout** かつ失敗時 `isFakeTimers:true` → (1) 系（fake timers 残留）。
3. **単独 pass / 同居のみ timeout** かつ `isFakeTimers:false` かつ `is mock:true, calls:1` → 未解明（共有 `QueryClient` の in-flight/cache 汚染が次の容疑）。useRef は反証済みで除外。
