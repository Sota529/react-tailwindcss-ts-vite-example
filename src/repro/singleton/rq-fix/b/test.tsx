import { QueryClient } from '@tanstack/react-query'
import { expect, it } from 'vitest'

// テスト毎に new QueryClient を作れば（= wrapper の client を SUT に届ければ）漏れない。
it('per-test な QueryClient なら漏れない', () => {
  const client = new QueryClient()
  expect(client.getQueryData(['k'])).toBeUndefined()
  client.setQueryData(['k'], 'x')
})
