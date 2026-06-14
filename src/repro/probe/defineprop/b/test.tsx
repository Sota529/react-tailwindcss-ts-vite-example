import { expect, it } from 'vitest'
it('defineprop: __pDP は未定義のはず', () => {
  expect((globalThis as any).__pDP).toBeUndefined()
  Object.defineProperty(globalThis, '__pDP', { value: 1, configurable: true })
})
