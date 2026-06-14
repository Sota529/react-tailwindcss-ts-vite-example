import { expect, it } from 'vitest'

it('gtlistener: 自分のlistenerだけ反応=1のはず', () => {
  ;(globalThis as unknown as Record<string, number>).__gtc = 0
  globalThis.addEventListener('p-gt', () => {
    ;(globalThis as unknown as Record<string, number>).__gtc++
  })
  globalThis.dispatchEvent(new Event('p-gt'))
  expect((globalThis as unknown as Record<string, number>).__gtc).toBe(1)
})
