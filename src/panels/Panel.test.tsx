import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLayout } from '../state/layout'
import { Panel } from './Panel'

const NOW = 1_800_000_000_000

describe('panel wrapper status forms', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('accepts a bare status and shows no age', () => {
    const { container } = render(<Panel code="WX-02" title="NWS Alerts" status="live" />)
    expect(container.querySelector('.led')?.getAttribute('data-status')).toBe('live')
    expect(container.querySelector('.panel-age')).toBeNull()
    expect(container.querySelector('.led')?.getAttribute('aria-label')).toBe('live')
  })

  it('accepts a FeedState and shows an age that ticks once a second', () => {
    const { container } = render(
      <Panel code="WX-02" title="NWS Alerts" status={{ status: 'live', updatedAt: NOW - 12_000 }} />,
    )
    expect(container.querySelector('.panel-age')?.textContent).toBe('12s')
    expect(container.querySelector('.led')?.getAttribute('aria-label')).toBe('live, updated 12s ago')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(container.querySelector('.panel-age')?.textContent).toBe('17s')
  })

  it('shows live data as stale once it passes 3x its refresh interval', () => {
    const { container } = render(
      <Panel
        code="SPC-01"
        title="Storm Reports"
        status={{ status: 'live', updatedAt: NOW - 200_000, refreshMs: 60_000 }}
      />,
    )
    expect(container.querySelector('.led')?.getAttribute('data-status')).toBe('stale')
    expect(container.querySelector('.panel-age-stale')?.textContent).toBe('3m20s')
  })

  it('hides the age while collapsed', () => {
    useLayout.getState().toggleHidden('AUD-01')
    const { container } = render(
      <Panel code="AUD-01" title="Radio" status={{ status: 'live', updatedAt: NOW - 1_000 }} collapsible />,
    )
    expect(container.querySelector('.panel-age')).toBeNull()
    expect(container.querySelector('.panel-collapsed')).not.toBeNull()
    useLayout.getState().toggleHidden('AUD-01')
  })
})
