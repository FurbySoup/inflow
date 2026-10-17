import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FeedsQuiet } from './FeedsQuiet'

const offline = [
  { id: 'a', title: 'Feed A', watchUrl: 'https://www.youtube.com/channel/A/live' },
  { id: 'b', title: 'Feed B', watchUrl: 'https://www.youtube.com/channel/B/live' },
]

describe('FeedsQuiet', () => {
  afterEach(cleanup)

  it('shows the heading and the body with an SPC tip, and no embed', () => {
    const { container } = render(<FeedsQuiet offline={offline} />)
    expect(screen.getByText('NO CHASERS LIVE RIGHT NOW')).toBeTruthy()
    expect(screen.getByText(/checks 58 chasers and storm-coverage channels/)).toBeTruthy()
    const tips = [...container.querySelectorAll('abbr')].map((a) => a.textContent)
    expect(tips).toEqual(['SPC'])
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('lists each offline feed as an external link with the ↗ signifier', () => {
    render(<FeedsQuiet offline={offline} />)
    const a = screen.getByRole('link', { name: 'Feed A ↗' })
    expect(a.getAttribute('href')).toBe(offline[0]!.watchUrl)
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('renders no list when there is nothing offline to show', () => {
    const { container } = render(<FeedsQuiet offline={[]} />)
    expect(container.querySelector('.feeds-quiet-list')).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
