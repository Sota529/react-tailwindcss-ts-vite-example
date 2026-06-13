import { expect, it } from 'vitest'
import { getCount, increment } from '../counter'

/**
 * クロスファイル状態リーク — ファイル B。FINDINGS.md の原因2を検証する。
 *
 * - workspace の `isolate: false`(config) は無視されるため、ここは PASS してしまう。
 * - CLI `--no-isolate` を付ける、またはルート設定で isolate:false にすると
 *   A の globalThis 増分が共有され getCount() が 2 になり FAIL する。
 *   → workspace では isolate:false が効かない、という事象の証拠。
 */
it('B: 共有カウンタは 1 になる（--no-isolate だと 2 になり失敗）', () => {
  increment()
  expect(getCount()).toBe(1)
})
