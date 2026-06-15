import { useCallback, useRef } from 'react'

// 本物の useRef が必要なフック（ref.current にアクセスする）。
// useRef を vi.fn()(=undefined) にされると ref が undefined になり ref.current で throw する。
export const useStopPropagation = () => {
  const ref = useRef<{ count: number }>({ count: 0 })
  const onClick = useCallback(() => {
    ref.current.count += 1
    return ref.current.count
  }, [])
  return { onClick }
}
