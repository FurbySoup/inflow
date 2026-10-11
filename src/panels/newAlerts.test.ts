import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import { MAX_TOASTS, capStack, diffNewTornadoWarnings, rememberTornadoWarnings, zuluTime } from './newAlerts'

function alert(over: Partial<Alert> & Pick<Alert, 'id'>): Alert {
  return {
    event: 'Tornado Warning',
    severity: 'Extreme',
    headline: '',
    areaDesc: 'Moore, OK',
    onset: '2026-10-10T21:46:00Z',
    expires: '2026-10-10T22:30:00Z',
    geometry: null,
    states: ['GA'],
    zones: [],
    damageThreat: null,
    pds: false,
    ...over,
  }
}

const AOI = ['GA', 'SC']

describe('diffNewTornadoWarnings', () => {
  it('seeds on the first call and never toasts existing warnings', () => {
    const feed = [alert({ id: 'a' }), alert({ id: 'b' })]
    expect(diffNewTornadoWarnings(null, feed, AOI)).toEqual([])
  })

  it('returns one new tornado warning in the AOI', () => {
    const seen = rememberTornadoWarnings(null, [alert({ id: 'a' })])
    const feed = [alert({ id: 'a' }), alert({ id: 'b' })]
    const fresh = diffNewTornadoWarnings(seen, feed, AOI)
    expect(fresh.map((a) => a.id)).toEqual(['b'])
  })

  it('ignores a new tornado warning outside the AOI', () => {
    const seen = new Set<string>()
    const feed = [alert({ id: 'far', states: ['OK'] })]
    expect(diffNewTornadoWarnings(seen, feed, AOI)).toEqual([])
  })

  it('ignores severe thunderstorm warnings', () => {
    const seen = new Set<string>()
    const feed = [alert({ id: 'svr', event: 'Severe Thunderstorm Warning' })]
    expect(diffNewTornadoWarnings(seen, feed, AOI)).toEqual([])
  })

  it('does not toast the same id twice', () => {
    const feed = [alert({ id: 'a' })]
    const first = diffNewTornadoWarnings(new Set(), feed, AOI)
    expect(first).toHaveLength(1)
    const seen = rememberTornadoWarnings(new Set(), feed)
    expect(diffNewTornadoWarnings(seen, feed, AOI)).toEqual([])
  })

  it('includes tornado emergencies', () => {
    const seen = new Set<string>()
    const feed = [alert({ id: 'e', damageThreat: 'catastrophic', pds: true })]
    expect(diffNewTornadoWarnings(seen, feed, AOI).map((a) => a.id)).toEqual(['e'])
  })

  it('remembers warnings from outside the AOI so panning in does not toast them', () => {
    const seen = rememberTornadoWarnings(null, [alert({ id: 'far', states: ['OK'] })])
    expect(seen.has('far')).toBe(true)
    expect(diffNewTornadoWarnings(seen, [alert({ id: 'far', states: ['OK'] })], AOI)).toEqual([])
  })
})

describe('capStack', () => {
  it('keeps at most three, dropping the oldest', () => {
    expect(MAX_TOASTS).toBe(3)
    expect(capStack(['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'd'])
    expect(capStack(['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('zuluTime', () => {
  it('formats UTC hh:mmZ', () => {
    expect(zuluTime('2026-10-10T21:46:00-04:00')).toBe('01:46Z')
    expect(zuluTime('2026-10-10T22:09:30Z')).toBe('22:09Z')
  })

  it('returns null for absent or invalid times', () => {
    expect(zuluTime(null)).toBeNull()
    expect(zuluTime('not a date')).toBeNull()
  })
})
