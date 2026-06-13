import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Ticker, getMountCount } from './Ticker'

/**
 * 症状B: クラッシュ/ハング。
 *
 * isolate:false でモジュールスコープの mountLog が共有され、テストをまたいで累積する。
 * さらに Ticker の setInterval が cleanup されないため、未解放 timer が残り、
 * vitest がワーカーを終了できず open handle 警告 / ハングを起こす。
 */
it('Ticker をレンダリングできる', () => {
  render(<Ticker />)
  expect(screen.getByText(/tick:/)).toBeInTheDocument()
})

it('モジュール状態がリークしない（isolate:false だと失敗する）', () => {
  render(<Ticker />)
  // このファイル単体でも cleanup されないと前テストの mount が残るため 1 件にならない。
  // isolate:false では他ファイルの mount も加算され、さらに乖離する。
  expect(getMountCount()).toBe(1)
})
