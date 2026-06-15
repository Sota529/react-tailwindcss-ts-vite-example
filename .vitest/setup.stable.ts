import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// isolate:true でも残る「同一ファイル内のテスト間汚染」を断つ共通 teardown。
// （クロスファイル汚染は isolate:true が面倒を見るので、ここは within-file 専用）
afterEach(() => {
  cleanup() // RTL の DOM 残留（globals:false でも確実に掃除）
  vi.useRealTimers() // fake timers 残留を断つ（clearMocks/restoreMocks では戻らない）
  vi.unstubAllGlobals() // vi.stubGlobal 残留
  vi.unstubAllEnvs() // vi.stubEnv 残留
})
