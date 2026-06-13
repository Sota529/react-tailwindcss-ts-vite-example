import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from '../../components/App'

/**
 * 症状A: DOM/状態がテスト間でリークする。
 *
 * workspace で globals が落ちているため it/expect は vitest から明示 import している。
 * その結果、import 時に global の afterEach が存在せず RTL の自動 cleanup が登録されない。
 * isolate:false で document が共有されるため、前テストの DOM が残り、
 * 2 つ目の it で "Hello World" が複数見つかり getByText が "Found multiple elements" で失敗する。
 */
it('1 回目のレンダリング', () => {
  render(<App />)
  expect(screen.getByText('Hello World')).toBeInTheDocument()
})

it('2 回目のレンダリング（cleanup されないと前回の DOM が残る）', () => {
  render(<App />)
  // cleanup が走っていれば 1 件。リークすると 2 件以上 → getByText が throw する。
  expect(screen.getByText('Hello World')).toBeInTheDocument()
})
