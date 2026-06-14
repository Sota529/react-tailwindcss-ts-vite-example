import { expect, it } from 'vitest'
it('gtlistener: 自分のlistenerだけ反応=1のはず', () => {
  ;(globalThis as any).__gtc = 0
  globalThis.addEventListener('p-gt', () => { (globalThis as any).__gtc++ })
  globalThis.dispatchEvent(new Event('p-gt'))
  expect((globalThis as any).__gtc).toBe(1)
})
