import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { sharedQc } from './sharedClient'

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={sharedQc}>{children}</QueryClientProvider>
)

// test1: 同じ key を never-resolve で fetch 開始し、loading のまま終える（in-flight を残す）
it('1: 同じ key を in-flight のまま残す', async () => {
  const neverFn = vi.fn(
    () =>
      new Promise<string>(() => {
        // never resolve（in-flight を残す）
      })
  )
  const { result } = renderHook(
    () => useQuery({ queryKey: ['shared-k'], queryFn: neverFn }),
    { wrapper: wrap }
  )
  await waitFor(() => expect(result.current.isLoading).toBe(true))
  expect(neverFn).toHaveBeenCalledTimes(1)
})

// test2: 同じ key を resolve する mock で再取得。共有 client の in-flight に dedup されると hang する
it('2: 同じ key を resolve して success を待つ', async () => {
  const okFn = vi.fn(async () => 'OK')
  const { result } = renderHook(
    () => useQuery({ queryKey: ['shared-k'], queryFn: okFn }),
    { wrapper: wrap }
  )
  // eslint-disable-next-line no-console
  console.log('[sc-2] isFakeTimers:', vi.isFakeTimers())
  await waitFor(() => expect(result.current.isSuccess).toBe(true), {
    timeout: 2000
  })
  // eslint-disable-next-line no-console
  console.log(
    '[sc-2] okFn calls:',
    okFn.mock.calls.length,
    'data:',
    result.current.data
  )
})
