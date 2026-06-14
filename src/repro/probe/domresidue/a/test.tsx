import { expect, it } from 'vitest'

it('domresidue: body は空のはず', () => {
  expect(document.body.querySelectorAll('[data-probe]').length).toBe(0)
  const d = document.createElement('div')
  d.setAttribute('data-probe', '')
  document.body.appendChild(d)
})
