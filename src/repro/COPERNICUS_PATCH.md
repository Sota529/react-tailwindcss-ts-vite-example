# Copernicus(copernicus-frontend) 適用パッチ — 目標: `isolate: true` で全テスト pass

本書は harness（`src/repro/`）で実証した結果を Copernicus 本体に当てるための具体パッチ。
前提（本セッションで把握済みの Copernicus 構成）:

- `vitest.workspace.ts` でプロジェクト定義（`globals: true` / `clearMocks: true` / `restoreMocks: true` は project 側）
- `isolate: false` は **ルート `vite.config.ts` の `test`**
- `setup.mock.ts` が `vi.doMock('react', …)` で `useRef` を `vi.fn()` 化（← timeout 原因としては**反証済み**、触らなくてよい）
- 失敗5本: `DrawerModal/hooks.test.ts` / `AsahiCampaign/useQueryAsahiCampaign.test.ts` / `campaignRewardPoint/queries.test.ts` / `paymentCompleteNotify/mutations.test.ts` / `CartOrderButton/hooks.test.ts`

実証要点: **`isolate:true` はファイル単位で worker/モジュール/グローバルを作り直す → クロスファイル汚染は原理的に消える**。
残るのは「同一ファイル内のテスト間汚染」だけで、それは下の Patch 2 + Patch 3 で潰す。

---

## Patch 1 — `isolate: true` へ（ルート `vite.config.ts`）

`isolate` は **root-only オプション**。workspace の project に書いても無視されるので、必ずルートで。

```diff
// vite.config.ts
 export default defineConfig({
   plugins: [react(), tsconfigPaths()],
   test: {
-    isolate: false,
+    isolate: true, // ← または行ごと削除（既定が true）。クロスファイル汚染を断つ
     // globals / clearMocks / restoreMocks 等は現状のまま
   },
 })
```

> CLI で一時確認するなら: `vitest run`（既定 isolate:true）。`--no-isolate` を付けない。

これ**単独で**、クロスファイル由来だった以下が直る見込み（harness の同型は全 PASS 化を確認）:
`AsahiCampaign` / `paymentCompleteNotify`（共有 React module 経由の re-render 不発説）、
`DrawerModal`（`useCallbackAfterOrderSuccess.test.ts` の fake timers が**別ファイル**になり波及しない）、
`CartOrderButton`（`importActual` が他ファイルの auto-mock を拾わなくなる）。

---

## Patch 2 — within-file 共通 teardown（global setup に追記）

`isolate:true` でも「同一ファイル内のテスト間」では DOM・timer・stub が残る。
既存の global setup（`setup.mock.ts` 等、`setupFiles` で読まれるファイル）に **以下の `afterEach` を追記**。

```ts
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()             // RTL の DOM 残留（globals:true なら自動だが明示しておくと確実）
  vi.useRealTimers()    // fake timers 残留を断つ（clearMocks/restoreMocks では戻らない）
  vi.unstubAllGlobals() // vi.stubGlobal 残留
  vi.unstubAllEnvs()    // vi.stubEnv 残留
})
```

harness 実証: これだけで `leak`（DOM残留）と `ftseq`（fake timers残留→`waitFor` timeout）が PASS 化。

> 追加で config に `unstubGlobals: true` / `unstubEnvs: true` を入れてもよい（同等効果。ただし `vi.stubEnv` 専用で、`process.env.X = …` 直代入はカバーしない）。

---

## Patch 3 — `campaignRewardPoint/queries.test.ts`（`is mock: false` → timeout）

採取で `repo.get is mock: false`。これは **`restoreMocks: true` が各テスト前に `restoreAllMocks()` を走らせ、`beforeEach` 外で張った `spyOn` を毎回剥がしている**ため（harness `rm-modlevel` で再現＝**単独でも timeout**。`rm-beforeeach` で修正を実証）。
`isolate:true` にしても within-file なので**残る**。次のどちらかを当てる。

### 方法A: `spyOn` を `beforeEach` 内へ移す（最小変更）

```diff
 import { repositories } from '~/repositories'

-vi.spyOn(repositories, 'get').mockResolvedValue(mockData)   // ← module/describe 直下はNG
-vi.spyOn(repositories, 'post').mockResolvedValue(mockRes)
+beforeEach(() => {
+  vi.spyOn(repositories, 'get').mockResolvedValue(mockData)
+  vi.spyOn(repositories, 'post').mockResolvedValue(mockRes)
+})
```

### 方法B: `vi.mock` を明示宣言（spyOn インスタンス不一致も同時に回避）

```ts
vi.mock('~/repositories', () => ({
  repositories: { get: vi.fn(), post: vi.fn() },
}))
import { repositories } from '~/repositories'

beforeEach(() => {
  vi.mocked(repositories.get).mockResolvedValue(mockData)
  vi.mocked(repositories.post).mockResolvedValue(mockRes)
})
```

> `vi.resetModules()` + `await import('~/repositories')` で SUT と別インスタンスに spy していた場合は方法B（または SUT と同一の import 経路に spy）で確実に直る。

---

## Patch 4 — 残ったファイルの within-file チェック（必要時のみ）

Patch 1+2 適用後も落ちるファイルがあれば、harness の判別表で対応:

| within-file 症状 | 修正 |
|---|---|
| 自ファイル内で `vi.useFakeTimers()` を張りっぱなし | Patch 2 の `afterEach(useRealTimers)` で解消。個別に `afterEach`/`finally` でも可 |
| module レベルの可変状態がテスト間で累積 | リセット関数を用意し `beforeEach` で初期化（or singleton を避ける） |
| SUT の `setInterval`/購読 cleanup 漏れ | unmount で `clearInterval` 等を返す（`useEffect` の cleanup） |
| `spyOn` が `beforeEach` 外（`restoreMocks` で剥がれる） | Patch 3 と同じく `beforeEach` へ |

---

## 適用順と検証

1. Patch 1（isolate:true）→ `vitest run`。落ちるファイルが激減するはず。
2. Patch 2（共通 afterEach）→ 再実行。timer/DOM/stub 由来が消える。
3. 残りに Patch 3/4 を個別適用。
4. 速度が問題なら、別途 `isolate:false` ＋ per-test fresh 化（FINDINGS 前半）へ。ただし「まず全 green」は isolate:true が最短。

## オプション（必須でない）

- `setup.mock.ts` の `useRef = vi.fn()` は timeout 原因ではない（反証済み）。テストで `useRef` 呼び出しを検証していないなら**削除してよい**が、全 green には不要。
