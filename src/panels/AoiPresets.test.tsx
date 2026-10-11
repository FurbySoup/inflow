import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AoiPresets } from './AoiPresets'

const tipOf = (text: string) =>
  [...document.querySelectorAll('abbr')].find((a) => a.textContent === text)?.getAttribute('title')

describe('AoiPresets acronym tips', () => {
  afterEach(() => cleanup())

  it('tips the SE, DIXIE and PLAINS labels and keeps the button names', () => {
    render(<AoiPresets />)
    expect(tipOf('SE')).toMatch(/^Southeast/)
    expect(tipOf('DIXIE')).toMatch(/^Dixie Alley/)
    expect(tipOf('PLAINS')).toMatch(/^Plains/)
    const names = [...document.querySelectorAll('button')].map((b) => b.textContent)
    expect(names).toEqual(['PLAINS', 'DIXIE', 'SE'])
  })
})
