import { expect, it } from 'vitest'
it('gprop: globalThis 素プロパティは未定義のはず', () => {
  expect((globalThis as any).__pGprop).toBeUndefined()
  ;(globalThis as any).__pGprop = 1
})
