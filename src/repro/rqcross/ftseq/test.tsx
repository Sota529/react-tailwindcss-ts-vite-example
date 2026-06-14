import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useThing } from '../../rqhang/useThing'
import { makeWrapper } from '../../rqhang/wrapper'

it('1: fake timers を入れて戻さない', () => {
  vi.useFakeTimers()
  expect(vi.isFakeTimers()).toBe(true)
})

it('2: 残留 fake timers 下で RQ waitFor', async () => {
  // eslint-disable-next-line no-console
  console.log('[ftseq-2] isFakeTimers at start:', vi.isFakeTimers())
  const { result } = renderHook(() => useThing(), { wrapper: makeWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true), {
    timeout: 2000
  })
  expect(result.current.data).toBe('OK')
})
