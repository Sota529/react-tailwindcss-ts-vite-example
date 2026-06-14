import { expect, it } from 'vitest'

it('gprop: globalThis 素プロパティは未定義のはず', () => {
  expect(
    (globalThis as unknown as Record<string, number>).__pGprop
  ).toBeUndefined()
  ;(globalThis as unknown as Record<string, number>).__pGprop = 1
})
