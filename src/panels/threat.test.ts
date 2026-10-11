import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import { threatSummary } from './threat'

const NOW = Date.parse('2026-10-11T18:00:00Z')
const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString()

const POLY = {
  type: 'Polygon' as const,
  coordinates: [[[-81.7, 32.7], [-81.5, 32.7], [-81.5, 32.9], [-81.7, 32.7]]],
}

const alert = (over: Partial<Alert>): Alert => ({
  id: 'x',
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: '',
  areaDesc: '',
  onset: null,
  expires: at(30),
  geometry: POLY,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  sent: null,
  messageType: null,
  eventKey: 'x',
  ...over,
})

const AOI = ['GA', 'SC']

describe('threatSummary', () => {
  it('reports nothing when there are no tornado warnings', () => {
    expect(threatSummary([], AOI, NOW)).toEqual({ count: 0, pdsCount: 0, nextExpiryMs: null, target: null })
    const svr = alert({ id: 's', event: 'Severe Thunderstorm Warning' })
    expect(threatSummary([svr], AOI, NOW).count).toBe(0)
  })

  it('counts one warning and points at it', () => {
    const one = alert({ id: 'one', expires: at(12) })
    const s = threatSummary([one], AOI, NOW)
    expect(s.count).toBe(1)
    expect(s.pdsCount).toBe(0)
    expect(s.nextExpiryMs).toBe(12 * 60_000)
    expect(s.target?.id).toBe('one')
  })

  it('counts PDS warnings, including emergencies and considerable tornado threats', () => {
    const alerts = [
      alert({ id: 'plain' }),
      alert({ id: 'pds', pds: true }),
      alert({ id: 'emergency', damageThreat: 'catastrophic' }),
      alert({ id: 'considerable', damageThreat: 'considerable' }),
    ]
    const s = threatSummary(alerts, AOI, NOW)
    expect(s.count).toBe(4)
    expect(s.pdsCount).toBe(3)
  })

  it('targets the most severe warning: PDS first, then soonest expiry', () => {
    const alerts = [
      alert({ id: 'later', expires: at(40) }),
      alert({ id: 'soon', expires: at(5) }),
      alert({ id: 'pds-late', pds: true, expires: at(50) }),
    ]
    expect(threatSummary(alerts, AOI, NOW).target?.id).toBe('pds-late')
    expect(threatSummary(alerts.slice(0, 2), AOI, NOW).target?.id).toBe('soon')
  })

  it('next expiry is the soonest active tornado warning', () => {
    const alerts = [alert({ id: 'a', expires: at(25) }), alert({ id: 'b', expires: at(7) }), alert({ id: 'c', expires: at(90) })]
    expect(threatSummary(alerts, AOI, NOW).nextExpiryMs).toBe(7 * 60_000)
  })

  it('filters by AOI states', () => {
    const outside = alert({ id: 'al', states: ['AL'], pds: true, expires: at(1) })
    const inside = alert({ id: 'ga', states: ['GA', 'AL'], expires: at(20) })
    const s = threatSummary([outside, inside], AOI, NOW)
    expect(s.count).toBe(1)
    expect(s.pdsCount).toBe(0)
    expect(s.nextExpiryMs).toBe(20 * 60_000)
    expect(s.target?.id).toBe('ga')
  })

  it('ignores expired warnings', () => {
    const expired = alert({ id: 'old', expires: at(-3), pds: true })
    expect(threatSummary([expired], AOI, NOW)).toEqual({ count: 0, pdsCount: 0, nextExpiryMs: null, target: null })
  })

  it('prefers a warning with a polygon as the focus target over a zone-based one', () => {
    const zone = alert({ id: 'zone', geometry: null, pds: true })
    const polygon = alert({ id: 'polygon', expires: at(45) })
    expect(threatSummary([zone, polygon], AOI, NOW).target?.id).toBe('polygon')
    expect(threatSummary([zone], AOI, NOW).target?.id).toBe('zone')
  })

  it('has no expiry for warnings without one', () => {
    const s = threatSummary([alert({ id: 'open', expires: null })], AOI, NOW)
    expect(s.count).toBe(1)
    expect(s.nextExpiryMs).toBeNull()
  })
})
