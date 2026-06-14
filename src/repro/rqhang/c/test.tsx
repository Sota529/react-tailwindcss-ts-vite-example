import { expect, it, vi } from 'vitest'

// Copernicus 相当: React.useRef を vi.fn()（=undefined を返す）に差し替え
vi.mock('react', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, useRef: vi.fn() }
})

import { renderHook, waitFor } from '@testing-library/react'
import { useThing } from '../useThing'
import { makeWrapper } from '../wrapper'

it('c: useRef=vi.fn() のとき crash か timeout か', async () => {
  const { result } = renderHook(() => useThing(), { wrapper: makeWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true), {
    timeout: 3000
  })
})
