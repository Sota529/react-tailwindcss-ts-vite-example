import { useEffect, useState } from 'react'

const mountLog: number[] = []
export const getMountCount = () => mountLog.length
// 修正パターン1: module 状態を初期化できる口を用意（テストの beforeEach で呼ぶ）
export const resetMountLog = () => {
  mountLog.length = 0
}

export const Ticker = () => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    mountLog.push(Date.now())
    // 修正パターン2: 解放漏れを断つ（unmount/cleanup で clearInterval）
    const id = setInterval(() => setTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [])
  return <div>tick: {tick}</div>
}
