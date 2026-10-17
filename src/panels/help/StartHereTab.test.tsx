import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StartHereTab } from './StartHereTab'
import { START_HERE } from './startHere'

afterEach(cleanup)

describe('StartHereTab', () => {
  it('renders one numbered item per START_HERE step, in order', () => {
    const { container } = render(<StartHereTab />)
    const items = container.querySelectorAll('ol.start-steps > li')
    expect(items).toHaveLength(START_HERE.length)
    START_HERE.forEach((step, i) => {
      expect(items[i]?.querySelector('.help-group-title')?.textContent).toBe(step.title)
    })
  })

  it('shows every step body, with glossary terms tipped as abbr', () => {
    const { container } = render(<StartHereTab />)
    const bodies = container.querySelectorAll('.start-body')
    START_HERE.forEach((step, i) => {
      expect(bodies[i]?.textContent).toBe(step.body)
    })
    // "DIXIE" is a glossary term in step 1, a whole word, so TaggedText tips it.
    const dixie = screen.getByText('DIXIE', { selector: 'abbr' })
    expect(dixie.getAttribute('title')).toBeTruthy()
  })

  it('has nothing focusable and no buttons or inputs', () => {
    const { container } = render(<StartHereTab />)
    expect(container.querySelector('button, input, a[href], [tabindex]')).toBeNull()
  })
})
