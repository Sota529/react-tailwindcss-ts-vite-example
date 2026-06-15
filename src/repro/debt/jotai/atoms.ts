import { atom } from 'jotai'
// module レベルの atom。識別子(オブジェクト参照)が同一であることが前提。
export const countAtom = atom(0)
