import { expect, it, vi } from 'vitest'
it('stubglobal: __pStub は未定義のはず', () => {
  expect((globalThis as any).__pStub).toBeUndefined()
  vi.stubGlobal('__pStub', 1)
})
