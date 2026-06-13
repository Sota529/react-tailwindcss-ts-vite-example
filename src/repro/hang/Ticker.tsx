import { useEffect, useState } from 'react'

/**
 * モジュールスコープの共有状態。
 * isolate:false では同一ワーカー内でモジュールレジストリが共有されるため、
 * この配列はテスト/ファイルをまたいで保持され、累積していく。
 */
const mountLog: number[] = []

export const getMountCount = () => mountLog.length

export const Ticker = () => {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    mountLog.push(Date.now())
    // 意図的に clearInterval しない（cleanup 漏れの再現）。
    // cleanup が走らないと、テスト終了後も timer が生き残り、
    // アンマウント済みコンポーネントへの setState が走り続けてワーカーがハングする。
    setInterval(() => setTick(t => t + 1), 50)
    return undefined
  }, [])

  return <div>tick: {tick}</div>
}
