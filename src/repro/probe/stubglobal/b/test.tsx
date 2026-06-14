import { expect, it, vi } from 'vitest'

it('stubglobal: __pStub は未定義のはず', () => {
  expect(
    (globalThis as unknown as Record<string, number>).__pStub
  ).toBeUndefined()
  vi.stubGlobal('__pStub', 1)
})
