import { expect, it, vi } from 'vitest'
vi.mock('../dep', () => ({ val: () => 'MOCK' }))
import { val } from '../dep'
it('vimock-b: mock が効くはず', () => {
  expect(val()).toBe('MOCK')
})
