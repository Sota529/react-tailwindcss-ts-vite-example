import { it } from 'vitest'

// msw の waitFor 等を await せず放置すると、テスト終了後に reject して Unhandled Rejection になる。
it('leak: 非同期を await しない（tail rejection を残す）', () => {
  // 再現のため意図的に await しない（floating promise を残す）
  void Promise.resolve().then(() => {
    throw new Error('tail rejection (msw await 漏れ相当)')
  })
})
