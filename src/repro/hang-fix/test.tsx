import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { getMountCount, resetMountLog, Ticker } from './Ticker'

// 修正パターン: module 可変状態を毎テスト初期化（isolate:true でも同一ファイル内では共有されるため）
beforeEach(() => {
  resetMountLog()
})

it('hang-fix-1: Ticker をレンダリングできる', () => {
  render(<Ticker />)
  expect(screen.getByText(/tick:/)).toBeInTheDocument()
})

it('hang-fix-2: module 状態がリークしない', () => {
  render(<Ticker />)
  expect(getMountCount()).toBe(1)
})
