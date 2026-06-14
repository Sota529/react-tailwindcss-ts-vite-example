import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { makeWrapper } from '../../rqhang/wrapper'
import { repo } from '../repo'
import { useRepo } from '../useRepo'

vi.spyOn(repo, 'get').mockResolvedValue('OK') // ← module レベル設定

it('modlevel-1: success', async () => {
  // eslint-disable-next-line no-console
  console.log('[modlevel-1] is mock:', vi.isMockFunction(repo.get))
  const { result } = renderHook(() => useRepo(), { wrapper: makeWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true), {
    timeout: 2000
  })
})
