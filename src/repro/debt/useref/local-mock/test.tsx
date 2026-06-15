import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useStopPropagation } from '../useStopPropagation'

// グローバル mock 無し（撤廃後の世界）。本物の useRef が使える。
it('local-mock: グローバル mock 撤廃で本物の useRef が動く', () => {
  const { result } = renderHook(() => useStopPropagation())
  act(() => {
    expect(result.current.onClick()).toBe(1)
    expect(result.current.onClick()).toBe(2)
  })
})
