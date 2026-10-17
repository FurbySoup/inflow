import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { ToastRegion } from './ToastRegion'

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
  sent: new Date().toISOString(),
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

// Only the data field is read by ToastRegion.
const feed = (data: Alert[]) => ({ data }) as unknown as ReturnType<typeof useSource>

describe('ToastRegion', () => {
  beforeEach(() => {
    useAoi.setState({ focus: null, bbox: { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }, states: ['GA', 'SC'] })
  })
  afterEach(() => {
    cleanup()
    vi.mocked(useSource).mockReset()
  })

  it('shows a new tornado warning toast without moving focus out of a focused input', () => {
    const existing = alert({ id: 'old', eventKey: 'KCHS.TO.W.old' })
    vi.mocked(useSource).mockReturnValue(feed([existing]))
    // Fresh elements per render: a reused element object would bail out of re-rendering ToastRegion.
    const tree = () => (
      <>
        <input aria-label="search" />
        <ToastRegion />
      </>
    )
    const { rerender } = render(tree())
    const field = screen.getByRole('textbox', { name: 'search' })
    field.focus()

    vi.mocked(useSource).mockReturnValue(feed([existing, alert({ id: 'new' })]))
    rerender(tree())

    expect(screen.getByRole('alert').textContent).toContain('Tornado Warning')
    expect(document.activeElement).toBe(field)
  })

  it('moves focus to the new toast FOCUS MAP button when the user is not typing', () => {
    const existing = alert({ id: 'old', eventKey: 'KCHS.TO.W.old' })
    vi.mocked(useSource).mockReturnValue(feed([existing]))
    const { rerender } = render(<ToastRegion />)

    vi.mocked(useSource).mockReturnValue(feed([existing, alert({ id: 'new' })]))
    rerender(<ToastRegion />)

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /FOCUS MAP/ }))
  })

  it('FOCUS MAP sets the AOI focus to the warning', () => {
    vi.mocked(useSource).mockReturnValue(feed([]))
    const { rerender } = render(<ToastRegion />)

    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'new' })]))
    rerender(<ToastRegion />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FOCUS MAP/ }))
    })
    expect(useAoi.getState().focus?.id).toBe('new')
  })

  it('does not toast a same-state warning whose polygon is outside the AOI', () => {
    vi.mocked(useSource).mockReturnValue(feed([]))
    const { rerender } = render(<ToastRegion />)

    // GA by state, but the polygon sits west of the default AOI bbox: only the polygon test excludes it.
    const far = alert({
      id: 'far',
      geometry: { type: 'Polygon', coordinates: [[[-95, 35], [-94.9, 35], [-94.9, 35.1], [-95, 35]]] },
    })
    vi.mocked(useSource).mockReturnValue(feed([far]))
    rerender(<ToastRegion />)

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
