import { describe, expect, it } from 'vitest'
import { HAZARD } from '../map/mapStyle'
import type { Alert } from '../types'
import { badgedFavicon, countInAoi, levelFor, titleFor } from './warningTitle'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#0D1115"/><rect x="6" y="6" width="4" height="4" fill="#F2F5F7"/></svg>'

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

const alert = (over: Partial<Alert> & Pick<Alert, 'id' | 'event'>): Alert => ({
  severity: 'Extreme',
  headline: '',
  areaDesc: 'Bulloch, GA',
  onset: null,
  sent: null,
  expires: new Date(Date.now() + 30 * 60_000).toISOString(),
  messageType: 'Alert',
  eventKey: `KCHS.${over.id}`,
  geometry: POLY,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  ...over,
})

const AOI = { bbox: { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }, states: ['GA', 'SC'] }

describe('titleFor', () => {
  it('shows the plain brand with no warnings', () => {
    expect(titleFor({ tor: 0, svr: 0 })).toBe('INFLOW')
  })
  it('shows the tornado count alone', () => {
    expect(titleFor({ tor: 2, svr: 0 })).toBe('(2 TOR) INFLOW')
  })
  it('shows both counts, tornado first', () => {
    expect(titleFor({ tor: 1, svr: 3 })).toBe('(1 TOR · 3 SVR) INFLOW')
  })
  it('shows the severe count alone', () => {
    expect(titleFor({ tor: 0, svr: 3 })).toBe('(3 SVR) INFLOW')
  })
  it('never says clear, safe or none', () => {
    for (let tor = 0; tor <= 3; tor++) {
      for (let svr = 0; svr <= 3; svr++) {
        const out = titleFor({ tor, svr }).toLowerCase()
        expect(out).not.toMatch(/clear|safe|none/)
      }
    }
  })
})

describe('levelFor', () => {
  it('prefers tornado over severe, null with neither', () => {
    expect(levelFor({ tor: 1, svr: 4 })).toBe('tor')
    expect(levelFor({ tor: 0, svr: 4 })).toBe('svr')
    expect(levelFor({ tor: 0, svr: 0 })).toBeNull()
  })
})

describe('badgedFavicon', () => {
  it('returns the text unchanged for a null level', () => {
    expect(badgedFavicon(SVG, null)).toBe(SVG)
  })
  it('keeps the original SVG and adds exactly one dot before the closing tag', () => {
    const out = badgedFavicon(SVG, 'tor')
    expect(out.startsWith(SVG.slice(0, -'</svg>'.length))).toBe(true)
    expect(out.endsWith('</svg>')).toBe(true)
    expect(out.match(/<circle/g)).toHaveLength(1)
    expect(out.match(/<\/svg>/g)).toHaveLength(1)
    expect(out).toContain('<circle cx="12.5" cy="12.5" r="3.5"')
  })
  it('uses the tornado hex for tor and the severe hex for svr', () => {
    expect(badgedFavicon(SVG, 'tor')).toContain(`fill="${HAZARD.TOR}"`)
    expect(badgedFavicon(SVG, 'svr')).toContain(`fill="${HAZARD.SVR}"`)
  })
})

describe('countInAoi', () => {
  it('counts only active alerts of the requested code inside the AOI', () => {
    const alerts = [
      alert({ id: 'a', event: 'Severe Thunderstorm Warning' }),
      alert({ id: 'b', event: 'Tornado Warning' }),
      alert({ id: 'c', event: 'Severe Thunderstorm Warning', geometry: null, states: ['TX'] }),
      alert({ id: 'd', event: 'Severe Thunderstorm Warning', expires: new Date(0).toISOString() }),
    ]
    expect(countInAoi(alerts, AOI, Date.now(), 'SVR')).toBe(1)
    expect(countInAoi(alerts, AOI, Date.now(), 'TOR')).toBe(1)
  })
})
