/**
 * グローバルスコープに状態を持つカウンタ。
 *
 * vitest はファイル単位でモジュールを再評価するため module スコープの変数は
 * ファイル間で共有されないが、`isolate:false` では同一ワーカーの globalThis が
 * ファイルをまたいで共有される。多くのアプリ/ライブラリは window や global に
 * シングルトンを置くため、これが「isolate:false 固有」のクロスファイル状態リークになる。
 *
 * isolate:true なら各ファイルで新しいグローバルが用意され getCount() は 1。
 * isolate:false では先に走ったファイルの増分が漏れ、2 になって失敗する。
 */
declare global {
  // eslint-disable-next-line no-var
  var __reproCount: number | undefined
}

export const increment = () => {
  globalThis.__reproCount = (globalThis.__reproCount ?? 0) + 1
  return globalThis.__reproCount
}

export const getCount = () => globalThis.__reproCount ?? 0
