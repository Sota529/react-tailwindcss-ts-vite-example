import { expect, it } from 'vitest'

it('winprop: window.__wp は未定義のはず', () => {
  expect((window as unknown as Record<string, number>).__wp).toBeUndefined()
  ;(window as unknown as Record<string, number>).__wp = 1
})
