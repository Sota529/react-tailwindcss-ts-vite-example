import { expect, it } from 'vitest'

it('fixed: 非同期を await して reject を消化する', async () => {
  await expect(
    Promise.resolve().then(() => {
      throw new Error('handled')
    })
  ).rejects.toThrow('handled')
})
