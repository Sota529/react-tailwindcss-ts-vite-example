import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'

// 修正パターン: テスト毎に新しい QueryClient を作る（in-flight/cache を持ち越さない）
const freshWrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

it('1: in-flight を残す（が client は使い捨て）', async () => {
  const neverFn = vi.fn(
    () =>
      new Promise<string>(() => {
        // never resolve（in-flight を残す）
      })
  )
  const { result } = renderHook(
    () => useQuery({ queryKey: ['shared-k'], queryFn: neverFn }),
    { wrapper: freshWrap() }
  )
  await waitFor(() => expect(result.current.isLoading).toBe(true))
})

it('2: 同じ key でも fresh client なので success する', async () => {
  const okFn = vi.fn(async () => 'OK')
  const { result } = renderHook(
    () => useQuery({ queryKey: ['shared-k'], queryFn: okFn }),
    { wrapper: freshWrap() }
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true), {
    timeout: 2000
  })
  expect(result.current.data).toBe('OK')
})
