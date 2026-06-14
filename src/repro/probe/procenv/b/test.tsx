import { expect, it } from 'vitest'

it('procenv: PROBE_ENV は未定義のはず', () => {
  expect(process.env.PROBE_ENV).toBeUndefined()
  process.env.PROBE_ENV = 'x'
})
