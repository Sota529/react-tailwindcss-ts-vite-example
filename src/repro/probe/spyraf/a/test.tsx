import { expect, it, vi } from 'vitest'

it('spyraf: rAF は素の関数のはず（spy化されていない）', () => {
  expect(vi.isMockFunction(globalThis.requestAnimationFrame)).toBe(false)
  vi.spyOn(globalThis, 'requestAnimationFrame')
})
