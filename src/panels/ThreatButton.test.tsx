import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { ThreatButton } from './ThreatButton'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

const POLY = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-81.7, 32.7],
      [-81.5, 32.7],
      [-81.5, 32.9],
      [-81.7, 32.7],
    ],
  ],
}

const alert = (over: Partial<Alert> & Pick<Alert, 'id'>): Alert => ({
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: '',
  areaDesc: 'Bulloch, GA',
  onset: null,
  sent: null,
  expires: new Date(Date.now() + 30 * 60_000).toISOString(),
  messageType: 'Alert',
  eventKey: `KCHS.TO.W.${over.id}`,
  geometry: POLY,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  ...over,
})

// Only the fields ThreatButton reads.
const feed = (data: Alert[] | undefined) =>
  ({ data, isError: false, isPending: data === undefined }) as unknown as ReturnType<typeof useSource>

describe('ThreatButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAoi.setState({ focus: null })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.mocked(useSource).mockReset()
  })

  it('has an accessible name that starts with the visible count text', () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a' }), alert({ id: 'b' })]))
    render(<ThreatButton />)
    const button = screen.getByRole('button')
    const visible = button.querySelector('.threat-full')?.textContent ?? ''
    expect(visible).toBe('2 TORNADO WARNINGS')
    expect(button.getAttribute('aria-label')).toBe('2 TORNADO WARNINGS, focus most severe')
    expect(button.getAttribute('aria-label')?.startsWith(visible)).toBe(true)
  })

  it('uses the singular for one warning', () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a' })]))
    render(<ThreatButton />)
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('1 TORNADO WARNING, focus most severe')
  })

  it('focuses the map on a polygon target', () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'poly' })]))
    render(<ThreatButton />)
    act(() => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(useAoi.getState().focus?.id).toBe('poly')
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('shows a ZONE ALERT note for 3 s when the target has no polygon', () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'zone', geometry: null })]))
    render(<ThreatButton />)
    act(() => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(useAoi.getState().focus).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('ZONE ALERT · NO POLYGON')

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(screen.getByRole('status').textContent).toBe('ZONE ALERT · NO POLYGON')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('shows a same-state polygon warning outside the AOI as no warnings', () => {
    // Polygon far west of the default AOI bbox, GA by state: excluded by the polygon test.
    const far = alert({
      id: 'far',
      geometry: { type: 'Polygon', coordinates: [[[-95, 35], [-94.9, 35], [-94.9, 35.1], [-95, 35]]] },
    })
    vi.mocked(useSource).mockReturnValue(feed([far]))
    render(<ThreatButton />)
    expect(screen.getByText('NO TORNADO WARNINGS')).toBeTruthy()
  })
})
