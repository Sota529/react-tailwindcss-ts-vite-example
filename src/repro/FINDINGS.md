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
