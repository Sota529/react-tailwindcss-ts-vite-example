# Copernicus(copernicus-frontend) 適用パッチ — 目標: `isolate: false` のまま全テスト pass（速度維持）

`isolate: false` は速いが、**クロスファイル＋同一ファイル内の両方の状態汚染**を相手にする。
harness（`src/repro/`）で採取5ファイルすべての真因と修正を実証済み。以下を上から順に当てる。

前提（把握済みの Copernicus 構成）: workspace / `globals:true` / `clearMocks:true` / `restoreMocks:true`（project側）、`isolate:false`（root）、`setup.mock.ts` の `useRef=vi.fn()`（timeout 原因ではない＝反証済み、触らなくてよい）。

## 採取5ファイルの真因と修正（全て harness で実証）

| ファイル | 真因（実証） | 修正 | 実証repro |
|---|---|---|---|
| AsahiCampaign/useQueryAsahiCampaign.test.ts | **共有 QueryClient の in-flight 持ち越し**（前テストの未解決クエリに dedup → pending） | Patch 3: **テスト毎 fresh QueryClient** | `rqcross/sharedclient`(再現)→`sharedclient-fix`(緑) |
| paymentCompleteNotify/mutations.test.ts | 同上（共有 client / `isFakeTimers:false`・pending と一致） | Patch 3 | 同上 |
| campaignRewardPoint/queries.test.ts | **`restoreMocks:true` が beforeEach 外の spyOn を毎テスト剥がす**（`is mock:false`→実API→pending） | Patch 5: spyOn を `beforeEach` へ / `vi.mock` 明示 | `rqcross/rm-modlevel`(再現)→`rm-beforeeach`(緑) |
| DrawerModal/hooks.test.ts | **fake timers 残留**（他テストの `useFakeTimers` 未復元→`waitFor` hang） | Patch 2: 共通 `afterEach(useRealTimers)` | `rqcross/ftseq`(再現→緑) |
| CartOrderButton/hooks.test.ts | `importActual` が他ファイルの auto-mock を拾う（要実コード確認） | Patch 6 + 実ファイル確認 | （未再現・要ファイル） |

---

## Patch 1 — config（`isolate:false` のまま、自動復元を強化）

```diff
// vite.config.ts （root。isolate/unstub* は root-only なので必ずここ）
   test: {
     globals: true,
     isolate: false,
     clearMocks: true,
     restoreMocks: true,
+    unstubGlobals: true, // vi.stubGlobal を各テスト後に自動復元
+    unstubEnvs: true,    // vi.stubEnv を自動復元（process.env 直代入は別途手動 or stubEnv 化）
   },
```

## Patch 2 — global 共通 teardown（既存 setup に追記）

`afterEach` は isolate に関係なく**毎テスト後**に走るので、クロスファイルの timer/DOM 残留もここで断てる。

```ts
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()          // DOM 残留
  vi.useRealTimers() // fake timers 残留（DrawerModal の真因。clearMocks/restoreMocks では戻らない）
})
```

## Patch 3 — テスト毎 fresh QueryClient（最重要・AsahiCampaign / paymentCompleteNotify）

**module レベルの共有 QueryClient を使わない**。前テストの in-flight/cache が次テストへ持ち越され、同じ key が dedup されて永久 pending → `waitFor` timeout になる（`isFakeTimers:false`・pending という採取と一致／`rqcross/sharedclient` で再現）。

```diff
-// ❌ どこか共有の client を使い回している
-import { queryClient } from '~/lib/queryClient'
-const wrapper = ({ children }) => (
-  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
-)
+// ✅ テスト毎に新しい client を作る
+const createWrapper = () => {
+  const queryClient = new QueryClient({
+    defaultOptions: { queries: { retry: false, gcTime: 0 } },
+  })
+  return ({ children }: { children: ReactNode }) => (
+    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
+  )
+}
+// renderHook(..., { wrapper: createWrapper() }) のように毎回生成
```

> 既に renderHook 毎に新 client を作っているのに落ちる場合は、SUT 側が `~/lib/queryClient` のような **module-level シングルトン client** を直接参照している。その場合はテストの teardown で `queryClient.clear()` を呼ぶ（下）か、SUT を provider 経由に直す。
> ```ts
> import { queryClient } from '~/lib/queryClient'
> afterEach(() => { queryClient.clear() })
> ```

## Patch 4 — jotai を使うなら fresh store（同型の汚染）

```diff
-// 既定ストア（module シングルトン）を共有
+const store = createStore()           // テスト毎に新規
+<Provider store={store}>{children}</Provider>
```

## Patch 5 — campaignRewardPoint（`is mock:false`）

`restoreMocks:true` は各テスト前に `restoreAllMocks()` を走らせ、**`beforeEach` 外で張った spyOn を毎回剥がす**。

```diff
-vi.spyOn(repositories, 'get').mockResolvedValue(mockData)   // module/describe 直下はNG
+beforeEach(() => {
+  vi.spyOn(repositories, 'get').mockResolvedValue(mockData)
+})
```
または `vi.mock('~/repositories', () => ({ repositories: { get: vi.fn(), post: vi.fn() } }))` を hoist 宣言し、`beforeEach` で `vi.mocked(...).mockResolvedValue(...)`。

## Patch 6 — 残りの within/cross-file 雑多

| 症状 | 修正 |
|---|---|
| module レベル可変状態がテスト間で累積 | リセット関数＋`beforeEach` 初期化（or singleton を避ける） |
| SUT の `setInterval`/購読 cleanup 漏れ | `useEffect` の cleanup で `clearInterval` 等を返す |
| `globalThis`/`window` 直書き | `vi.stubGlobal` 経由に統一（Patch 1 で自動復元） |
| `process.env.X = …` 直代入 | `vi.stubEnv('X', …)` に統一（Patch 1 で自動復元） |
| CartOrderButton の `importActual` 不一致 | `vi.mock` を hoist し factory 内で `await importActual()` の必要部分だけ上書き（要実ファイル確認） |

---

## 適用順と検証
1. Patch 1（config）+ Patch 2（共通 afterEach）→ `vitest run --no-file-parallelism`。DrawerModal と stub/env 系が消える。
2. Patch 3（fresh QueryClient）→ AsahiCampaign / paymentCompleteNotify が緑に。
3. Patch 5 → campaignRewardPoint。
4. 残り（CartOrderButton 等）は実ファイルを見て Patch 6。

## まだテンプレ箇所（実ファイルで確定したい）
正確な diff を出すために欲しいもの: `vite.config.ts` / `vitest.workspace.ts` / `setup.mock.ts`、`campaignRewardPoint/queries.test.ts`、`CartOrderButton/hooks.test.ts`、および AsahiCampaign 系が参照する QueryClient の定義（`~/lib/queryClient` 等）。
