import { expect, it } from 'vitest'
it('winlistener: 自分のlistenerだけ反応=1のはず', () => {
  ;(globalThis as any).__wlc = 0
  window.addEventListener('p-win', () => { (globalThis as any).__wlc++ })
  window.dispatchEvent(new Event('p-win'))
  expect((globalThis as any).__wlc).toBe(1)
})
