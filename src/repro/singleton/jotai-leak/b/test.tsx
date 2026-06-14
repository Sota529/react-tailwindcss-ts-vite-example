import { getDefaultStore } from 'jotai'
import { expect, it } from 'vitest'
import { flagAtom } from '../../flagAtom'

// default store は jotai モジュールの singleton。isolate:false で共有され、
// 後発ファイルが前ファイルの set(true) を観測して落ちる。
it('jotai default store は初期値 false のはず', () => {
  const store = getDefaultStore()
  expect(store.get(flagAtom)).toBe(false)
  store.set(flagAtom, true)
})
