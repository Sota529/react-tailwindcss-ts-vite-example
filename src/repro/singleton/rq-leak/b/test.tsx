import { expect, it } from 'vitest'
import { queryClient } from '../../client'

// module-level queryClient のキャッシュは isolate:false で共有される（copernicus の campaignRewardPoint 型）。
it('module-level queryClient のキャッシュは空のはず', () => {
  expect(queryClient.getQueryData(['k'])).toBeUndefined()
  queryClient.setQueryData(['k'], 'x')
})
