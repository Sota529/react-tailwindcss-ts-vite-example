import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// 処方: 各テスト後に必ず実タイマーへ戻す（fake timers 残留を断つ）
afterEach(() => {
  vi.useRealTimers()
})
