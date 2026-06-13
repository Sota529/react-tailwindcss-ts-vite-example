import { defineWorkspace } from 'vitest/config'

/**
 * 再現用 workspace 設定。
 *
 * ポイント: workspace のプロジェクト設定は、ルート vite.config.ts の
 * `test.globals` / `test.environment` / `test.setupFiles` を自動継承しない。
 * ここでは environment / setupFiles だけ書き、`globals: true` を意図的に省略して
 * 「workspace 併用時に globals が落ちる」典型ミスを再現する。
 *
 * globals が無いと @testing-library/react の自動 cleanup（afterEach）が登録されず、
 * さらに `isolate: false` で同一ワーカー内に DOM・モジュール状態が共有されるため、
 * テスト/ファイル間で状態がリークし、未解放の timer でワーカーがハングする。
 */
export default defineWorkspace([
  {
    test: {
      name: 'repro',
      environment: 'happy-dom',
      setupFiles: '.vitest/setup',
      // globals: true,  // ← workspace では継承されない。意図的に未指定で事象を再現
      isolate: false,
      include: ['src/repro/**/test.tsx']
    }
  }
])
