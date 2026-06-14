import { expect, it } from 'vitest'
import { s } from '../state'

it('modsingleton: モジュール状態は初期値0のはず', () => {
  expect(s.n).toBe(0)
  s.n = 1
})
