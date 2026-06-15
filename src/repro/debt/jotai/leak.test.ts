import { createStore } from 'jotai'
import { expect, it, vi } from 'vitest'

it('leak: resetModules 後の再 import で atom 識別子がずれる', async () => {
  const m1 = await import('./atoms')
  const store = createStore()
  store.set(m1.countAtom, 5)
  expect(store.get(m1.countAtom)).toBe(5)

  vi.resetModules()
  const m2 = await import('./atoms') // ← 新しい atom オブジェクトになる
  // 同じ "countAtom" でも参照が違うので、store は別 atom 扱い → 初期値 0
  expect(store.get(m2.countAtom)).toBe(5) // これが失敗する（実際は 0）
})
