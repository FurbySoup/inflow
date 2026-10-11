import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { subscribeNotify, type NotifyEvent } from '../state/notify'
import type { Alert } from '../types'
import { useNotifyTriggers } from './useNotifyTriggers'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

const POLY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-81.7, 32.7],
      [-81.5, 32.7],
      [-81.5, 32.9],
      [-81.7, 32.7],
    ],
  ],
}

const tor = (eventKey: string): Alert => ({
  id: `id-${eventKey}`,
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: '',
  areaDesc: 'Bulloch, GA',
  onset: null,
  sent: null,
  expires: '2026-10-11T18:45:00Z',
  geometry: POLY,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  messageType: 'Alert',
  eventKey,
})

/** Feeds each adapter's data by its id; only the NWS alerts feed carries data here. */
function feed(alerts: Alert[] | undefined) {
  vi.mocked(useSource).mockImplementation((adapter) => {
    const data = adapter.id === 'nws-alerts' ? alerts : undefined
    return { data } as unknown as ReturnType<typeof useSource>
  })
}

describe('useNotifyTriggers', () => {
  afterEach(() => {
    vi.mocked(useSource).mockReset()
  })

  it('seeds the first feed and emits only what arrives after it', () => {
    const received: NotifyEvent[] = []
    const off = subscribeNotify((e) => received.push(e))

    feed([tor('KCHS.TO.W.1')])
    const { rerender } = renderHook(() => useNotifyTriggers())
    expect(received).toEqual([])

    feed([tor('KCHS.TO.W.1'), tor('KCHS.TO.W.2')])
    rerender()
    off()

    expect(received.map((e) => e.key)).toEqual(['KCHS.TO.W.2'])
  })
})
