import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useThing } from '../useThing'
import { makeWrapper } from '../wrapper'

it('a: useQuery が success になる', async () => {
  // 採取レポートと同じ観測ポイント
  // eslint-disable-next-line no-console
  console.log('[a] isFakeTimers:', vi.isFakeTimers())
  const { result } = renderHook(() => useThing(), { wrapper: makeWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
  expect(result.current.data).toBe('OK')
})
