import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { resetFaviconCacheForTests, useWarningTitle } from './useWarningTitle'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#0D1115"/></svg>'

const POLY_IN = {
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
const POLY_OUT = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-120.2, 40.0],
      [-120.0, 40.0],
      [-120.0, 40.2],
      [-120.2, 40.0],
    ],
  ],
}

const alert = (over: Partial<Alert> & Pick<Alert, 'id' | 'event'>): Alert => ({
  severity: 'Extreme',
  headline: '',
  areaDesc: 'Bulloch, GA',
  onset: null,
  sent: null,
  expires: new Date(Date.now() + 30 * 60_000).toISOString(),
  messageType: 'Alert',
  eventKey: `KCHS.${over.id}`,
  geometry: POLY_IN,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  ...over,
})

// Only the fields the hook reads.
const feed = (data: Alert[] | undefined) =>
  ({ data, isError: false, isPending: data === undefined }) as unknown as ReturnType<typeof useSource>

const AOI = { bbox: { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }, states: ['GA', 'SC'] }
const ORIGINAL_HREF = '/favicon.svg'

function iconLink(): HTMLLinkElement {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) throw new Error('no icon link in test document')
  return link
}

describe('useWarningTitle', () => {
  beforeEach(() => {
    useAoi.setState({ ...AOI, focus: null, aoiRequest: null })
    document.title = 'INFLOW'
    delete document.documentElement.dataset.tor
    document.head.innerHTML = `<link rel="icon" type="image/svg+xml" href="${ORIGINAL_HREF}">`
    resetFaviconCacheForTests()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(SVG) }),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.mocked(useSource).mockReset()
    document.head.innerHTML = ''
  })

  it('keeps the plain title while the feed is pending', () => {
    vi.mocked(useSource).mockReturnValue(feed(undefined))
    renderHook(() => useWarningTitle())
    expect(document.title).toBe('INFLOW')
    expect(document.documentElement.dataset.tor).toBeUndefined()
    expect(iconLink().getAttribute('href')).toBe(ORIGINAL_HREF)
  })

  it('shows one tornado in the AOI in the title, a data icon and data-tor', async () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Tornado Warning' })]))
    renderHook(() => useWarningTitle())
    expect(document.title).toBe('(1 TOR) INFLOW')
    expect(document.documentElement.dataset.tor).toBe('active')
    await waitFor(() => expect(iconLink().getAttribute('href')).toMatch(/^data:image\/svg\+xml/))
  })

  it('ignores a tornado outside the AOI', () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Tornado Warning', geometry: POLY_OUT })]))
    renderHook(() => useWarningTitle())
    expect(document.title).toBe('INFLOW')
    expect(document.documentElement.dataset.tor).toBeUndefined()
  })

  it('shows severe warnings without data-tor', async () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Severe Thunderstorm Warning' })]))
    renderHook(() => useWarningTitle())
    expect(document.title).toBe('(1 SVR) INFLOW')
    expect(document.documentElement.dataset.tor).toBeUndefined()
    await waitFor(() => expect(iconLink().getAttribute('href')).toMatch(/^data:image\/svg\+xml/))
  })

  it('restores the original icon and title when the counts return to zero', async () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Tornado Warning' })]))
    const { rerender } = renderHook(() => useWarningTitle())
    await waitFor(() => expect(iconLink().getAttribute('href')).toMatch(/^data:/))

    vi.mocked(useSource).mockReturnValue(feed([]))
    rerender()
    expect(document.title).toBe('INFLOW')
    expect(document.documentElement.dataset.tor).toBeUndefined()
    expect(iconLink().getAttribute('href')).toBe(ORIGINAL_HREF)
  })

  it('still updates the title when the favicon fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Tornado Warning' })]))
    renderHook(() => useWarningTitle())
    expect(document.title).toBe('(1 TOR) INFLOW')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(iconLink().getAttribute('href')).toBe(ORIGINAL_HREF)
  })

  it('restores the title, icon and data-tor on unmount', async () => {
    vi.mocked(useSource).mockReturnValue(feed([alert({ id: 'a', event: 'Tornado Warning' })]))
    const { unmount } = renderHook(() => useWarningTitle())
    await waitFor(() => expect(iconLink().getAttribute('href')).toMatch(/^data:/))

    unmount()
    expect(document.title).toBe('INFLOW')
    expect(document.documentElement.dataset.tor).toBeUndefined()
    expect(iconLink().getAttribute('href')).toBe(ORIGINAL_HREF)
  })
})
