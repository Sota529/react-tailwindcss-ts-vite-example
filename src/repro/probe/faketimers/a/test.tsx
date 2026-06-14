import { expect, it, vi } from 'vitest'
it('faketimers: 実タイマーのはず', () => {
  expect(vi.isFakeTimers()).toBe(false)
  vi.useFakeTimers()
})
