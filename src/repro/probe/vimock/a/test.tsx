import { expect, it } from 'vitest'
import { val } from '../dep'
it('vimock-a: real を import', () => {
  expect(val()).toBe('REAL')
})
