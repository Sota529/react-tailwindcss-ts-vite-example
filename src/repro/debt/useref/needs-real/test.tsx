import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useStopPropagation } from '../useStopPropagation'

// project 全体に効く useRef mock を模す（setup.mock.hooks.ts 相当）
vi.mock('react', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, useRef: vi.fn() }
})

it('needs-real: useRef mock 下では本物が要るフックが壊れる', () => {
  const { result } = renderHook(() => useStopPropagation())
  act(() => {
    expect(result.current.onClick()).toBe(1)
  })
})
