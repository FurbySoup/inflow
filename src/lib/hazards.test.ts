import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import { compareAlerts, hazardCode, isPds, isWatch, mostSevereTornado } from './hazards'

const alert = (over: Partial<Alert>): Alert => ({
  id: 'x',
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: '',
  areaDesc: '',
  onset: null,
  expires: '2026-10-11T18:00:00Z',
  geometry: null,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  sent: null,
  messageType: null,
  eventKey: 'x',
  ...over,
})

describe('hazardCode / isWatch', () => {
  it('maps NWS events to legend codes', () => {
    expect(hazardCode('Tornado Warning')).toBe('TOR')
    expect(hazardCode('Severe Thunderstorm Watch')).toBe('SVA')
    expect(hazardCode('Rip Current Statement')).toBe('OTHER')
    expect(isWatch('Tornado Watch')).toBe(true)
    expect(isWatch('Tornado Warning')).toBe(false)
  })
})

describe('isPds', () => {
  it('flags PDS text, emergencies and considerable-threat tornado warnings only', () => {
    expect(isPds(alert({ pds: true, event: 'Tornado Watch' }))).toBe(true)
    expect(isPds(alert({ damageThreat: 'catastrophic', event: 'Flash Flood Warning' }))).toBe(true)
    expect(isPds(alert({ damageThreat: 'considerable' }))).toBe(true)
    expect(isPds(alert({ damageThreat: 'considerable', event: 'Flash Flood Warning' }))).toBe(false)
    expect(isPds(alert({}))).toBe(false)
  })
})

describe('compareAlerts', () => {
  it('orders PDS, then hazard rank, then soonest expiry', () => {
    const svr = alert({ id: 'svr', event: 'Severe Thunderstorm Warning' })
    const torLate = alert({ id: 'tor-late', expires: '2026-10-11T19:00:00Z' })
    const torSoon = alert({ id: 'tor-soon', expires: '2026-10-11T17:00:00Z' })
    const pdsWatch = alert({ id: 'pds', event: 'Tornado Watch', pds: true })
    const other = alert({ id: 'other', event: 'Wind Advisory', expires: null })
    const sorted = [other, svr, torLate, pdsWatch, torSoon].sort(compareAlerts).map((a) => a.id)
    expect(sorted).toEqual(['pds', 'tor-soon', 'tor-late', 'svr', 'other'])
  })

  it('picks the most severe tornado warning, or null', () => {
    expect(mostSevereTornado([alert({ id: 'a' }), alert({ id: 'b', damageThreat: 'considerable' })])?.id).toBe('b')
    expect(mostSevereTornado([alert({ event: 'Flood Watch' })])).toBeNull()
  })
})
