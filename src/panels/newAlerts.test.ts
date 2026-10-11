import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import {
  MAX_TOASTS,
  capStack,
  diffNewTornadoWarnings,
  findCurrent,
  rememberTornadoWarnings,
  zuluTime,
} from './newAlerts'

function alert(over: Partial<Alert> & Pick<Alert, 'id'>): Alert {
  return {
    event: 'Tornado Warning',
    severity: 'Extreme',
    headline: '',
    areaDesc: 'Moore, OK',
    onset: '2026-10-10T21:46:00Z',
    sent: '2026-10-10T21:46:00Z',
    expires: '2026-10-10T22:30:00Z',
    messageType: 'Alert',
    eventKey: `KOUN.TO.W.${over.id}`,
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
    expect(diffNewTornadoWarnings(seen, feed, AOI).map((a) => a.id)).toEqual(['b'])
  })

  it('ignores a new tornado warning outside the AOI', () => {
    const feed = [alert({ id: 'far', states: ['OK'] })]
    expect(diffNewTornadoWarnings(new Set(), feed, AOI)).toEqual([])
  })

  it('ignores severe thunderstorm warnings', () => {
    const feed = [alert({ id: 'svr', event: 'Severe Thunderstorm Warning' })]
    expect(diffNewTornadoWarnings(new Set(), feed, AOI)).toEqual([])
  })

  it('does not toast the same eventKey twice', () => {
    const feed = [alert({ id: 'a' })]
    expect(diffNewTornadoWarnings(new Set(), feed, AOI)).toHaveLength(1)
    const seen = rememberTornadoWarnings(new Set(), feed)
    expect(diffNewTornadoWarnings(seen, feed, AOI)).toEqual([])
  })

  it('does not toast an NWS update for a known event (new id, same eventKey)', () => {
    const original = alert({ id: 'orig', eventKey: 'KFFC.TO.W.0123' })
    const seen = rememberTornadoWarnings(null, [original])
    const update = alert({ id: 'con-2', eventKey: 'KFFC.TO.W.0123', messageType: 'Update' })
    expect(diffNewTornadoWarnings(seen, [update], AOI)).toEqual([])
  })

  it('toasts a different eventKey even when the id is reused in the same area', () => {
    const seen = rememberTornadoWarnings(null, [alert({ id: 'a' })])
    const other = alert({ id: 'a', eventKey: 'KFFC.TO.W.0124' })
    expect(diffNewTornadoWarnings(seen, [other], AOI)).toEqual([other])
  })

  it('does not toast a cancellation', () => {
    const seen = new Set<string>()
    expect(diffNewTornadoWarnings(seen, [alert({ id: 'c', messageType: 'Cancel' })], AOI)).toEqual([])
  })

  it('includes tornado emergencies', () => {
    const feed = [alert({ id: 'e', damageThreat: 'catastrophic', pds: true })]
    expect(diffNewTornadoWarnings(new Set(), feed, AOI).map((a) => a.id)).toEqual(['e'])
  })

  it('remembers warnings from outside the AOI so panning in does not toast them', () => {
    const far = alert({ id: 'far', states: ['OK'] })
    const seen = rememberTornadoWarnings(null, [far])
    expect(seen.has(far.eventKey)).toBe(true)
    expect(diffNewTornadoWarnings(seen, [far], AOI)).toEqual([])
  })
})

describe('findCurrent', () => {
  it('returns the updated version so the open toast picks up a refreshed expiry', () => {
    const key = 'KFFC.TO.W.0123'
    const update = alert({
      id: 'con-2',
      eventKey: key,
      messageType: 'Update',
      expires: '2026-10-10T22:50:00Z',
      areaDesc: 'Moore, OK; Norman, OK',
    })
    const current = findCurrent([update], key)
    expect(current?.expires).toBe('2026-10-10T22:50:00Z')
    expect(current?.areaDesc).toBe('Moore, OK; Norman, OK')
  })

  it('returns null once the event is cancelled or gone from the feed', () => {
    const key = alert({ id: 'x' }).eventKey
    expect(findCurrent([alert({ id: 'x', messageType: 'Cancel' })], key)).toBeNull()
    expect(findCurrent([], key)).toBeNull()
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
