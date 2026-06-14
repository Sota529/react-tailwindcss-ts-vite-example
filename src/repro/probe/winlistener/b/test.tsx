import { expect, it } from 'vitest'

it('winlistener: 自分のlistenerだけ反応=1のはず', () => {
  ;(globalThis as unknown as Record<string, number>).__wlc = 0
  window.addEventListener('p-win', () => {
    ;(globalThis as unknown as Record<string, number>).__wlc++
  })
  window.dispatchEvent(new Event('p-win'))
  expect((globalThis as unknown as Record<string, number>).__wlc).toBe(1)
})
