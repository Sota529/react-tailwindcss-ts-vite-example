import { expect, it } from 'vitest'
it('winprop: window.__wp は未定義のはず', () => {
  expect((window as any).__wp).toBeUndefined()
  ;(window as any).__wp = 1
})
