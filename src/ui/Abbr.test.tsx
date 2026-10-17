import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TaggedText } from './Abbr'

describe('TaggedText', () => {
  afterEach(cleanup)

  it('tips a glossary term even with punctuation around it, keeping the punctuation outside', () => {
    const { container } = render(<TaggedText text="press PLAINS, DIXIE or SE. Then check the (SPC) days." />)
    const tipped = [...container.querySelectorAll('abbr')].map((a) => a.textContent)
    expect(tipped).toEqual(['PLAINS', 'DIXIE', 'SE', 'SPC'])
    expect(container.textContent).toBe('press PLAINS, DIXIE or SE. Then check the (SPC) days.')
  })

  it('leaves ordinary words and non-terms alone', () => {
    const { container } = render(<TaggedText text="Wind Advisory, no terms here." />)
    expect(container.querySelectorAll('abbr')).toHaveLength(0)
  })
})
