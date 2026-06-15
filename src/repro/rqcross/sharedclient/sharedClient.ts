import { QueryClient } from '@tanstack/react-query'
// module レベルの共有 QueryClient（Copernicus が共有 client を使う型を模す）
export const sharedQc = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})
