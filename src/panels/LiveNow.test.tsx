import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useStreams } from '../state/streams'
import { LiveNow, type LiveNowChip } from './LiveNow'

const chip = (n: number, extra: Partial<LiveNowChip> = {}): LiveNowChip => ({
  id: `feed-${n}`,
  name: `Chaser ${n}`,
  inAoi: false,
  coverage: false,
  ...extra,
})

describe('LiveNow', () => {
  afterEach(cleanup)

  it('shows the count and one chip per live feed, with the AOI badge and COVERAGE label', () => {
    render(
      <LiveNow
        chips={[chip(1, { inAoi: true }), chip(2, { coverage: true })]}
        shownId={null}
        checked={10}
        total={58}
      />,
    )
    expect(screen.getByText('LIVE NOW · 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Chaser 1 IN AOI/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Chaser 2 COVERAGE/ })).toBeTruthy()
  })

  it('collapses beyond 8 chips into +N MORE, which expands and collapses again', () => {
    const chips = Array.from({ length: 10 }, (_, i) => chip(i + 1))
    render(<LiveNow chips={chips} shownId={null} checked={58} total={58} />)
    expect(screen.queryAllByRole('button', { name: /^Chaser/ })).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: '+2 MORE' }))
    expect(screen.queryAllByRole('button', { name: /^Chaser/ })).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: '− LESS' }))
    expect(screen.queryAllByRole('button', { name: /^Chaser/ })).toHaveLength(8)
  })

  it('clicking a chip makes that feed the primary', () => {
    render(<LiveNow chips={[chip(1), chip(2)]} shownId="feed-1" checked={2} total={58} />)
    expect(screen.getByRole('button', { name: /^Chaser 1/ }).getAttribute('aria-current')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /^Chaser 2/ }))
    expect(useStreams.getState().primaryId).toBe('feed-2')
  })

  it('with nobody live, shows the checked counter', () => {
    render(<LiveNow chips={[]} shownId={null} checked={12} total={58} />)
    expect(screen.getByText('NO ROSTER CHASERS LIVE · CHECKED 12/58')).toBeTruthy()
  })
})
