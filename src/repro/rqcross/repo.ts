// 実 API 相当: テスト環境では解決しない promise を返す（mock されないと waitFor は timeout）
export const repo = {
  get: (): Promise<string> =>
    new Promise<string>(() => {
      // 意図的に never-resolve（実 API が解決しない状況を模す）
    })
}
