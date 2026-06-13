import { expect, it } from 'vitest'
import { getCount, increment } from '../counter'

/**
 * クロスファイル状態リーク（症状A/Bの isolate:false 固有部分）— ファイル A。
 */
it('A: 共有カウンタは 1 になる', () => {
  increment()
  expect(getCount()).toBe(1)
})
