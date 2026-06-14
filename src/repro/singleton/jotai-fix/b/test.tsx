import { createStore } from 'jotai'
import { expect, it } from 'vitest'
import { flagAtom } from '../../flagAtom'

// 各テストで createStore() した fresh store を使えば、isolate:false でも状態は漏れない。
it('jotai fresh store なら漏れない', () => {
  const store = createStore()
  expect(store.get(flagAtom)).toBe(false)
  store.set(flagAtom, true)
})
