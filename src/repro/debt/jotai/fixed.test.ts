import { createStore } from 'jotai'
import { expect, it } from 'vitest'
import { countAtom } from './atoms'

it('fixed: 静的 import で atom 識別子を固定し、store 毎 fresh にする', () => {
  const store = createStore() // テスト毎に fresh store
  store.set(countAtom, 5)
  expect(store.get(countAtom)).toBe(5)
})
