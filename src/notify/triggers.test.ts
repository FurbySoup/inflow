import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import type { WatchFeature } from '../sources/iemspc/watches'
import type { MesoscaleFeature } from '../sources/iemspc/mesoscale'
import { DEFAULT_AOI } from '../state/aoi'
import {
  diffNwsAlerts,
  diffRiskUpgrade,
  diffSpcMds,
  diffSpcWatches,
  remember,
  type Seen,
} from './triggers'

const aoi = { bbox: DEFAULT_AOI, states: ['GA', 'SC'] }
const NOW = Date.parse('2026-10-11T18:00:00Z')

// Inside the default AOI (GA/SC).
const INSIDE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-81.7, 32.7],
      [-81.5, 32.7],
      [-81.5, 32.9],
      [-81.7, 32.9],
      [-81.7, 32.7],
    ],
  ],
}
const OUTSIDE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-70.5, 41.0],
      [-70.3, 41.0],
      [-70.3, 41.2],
      [-70.5, 41.2],
      [-70.5, 41.0],
    ],
  ],
}

const alert = (over: Partial<Alert> & Pick<Alert, 'id' | 'eventKey'>): Alert => ({
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: '',
  areaDesc: 'Bulloch, GA; Screven, GA',
  onset: null,
  expires: '2026-10-11T18:45:00Z',
  geometry: INSIDE,
  states: ['GA'],
  zones: [],
  damageThreat: null,
  pds: false,
  sent: null,
  messageType: 'Alert',
  ...over,
})

const watch = (num: number, geometry: GeoJSON.MultiPolygon, kind: 'TOR' | 'SVR' = 'TOR'): WatchFeature => ({
  type: 'Feature',
  geometry,
  properties: { num, label: `${kind} ${num}`, expires: '2026-10-11T22:00:00Z', kind },
})

const INSIDE_WATCH: GeoJSON.MultiPolygon = { type: 'MultiPolygon', coordinates: [INSIDE.coordinates] }
const OUTSIDE_WATCH: GeoJSON.MultiPolygon = { type: 'MultiPolygon', coordinates: [OUTSIDE.coordinates] }

const md = (num: number, geometry: GeoJSON.Polygon): MesoscaleFeature => ({
  type: 'Feature',
  geometry,
  properties: { num, label: `MD ${num}`, expires: '2026-10-11T21:00:00Z', kind: 'MD' },
})

// A box straddling the AOI's eastern part (SC). Used for categorical risk.
const RISK_BOX: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-81, 32],
      [-79, 32],
      [-79, 34],
      [-81, 34],
      [-81, 32],
    ],
  ],
}
const risk = (label: string, issue: string, geometry: GeoJSON.Geometry = RISK_BOX): GeoJSON.Feature => ({
  type: 'Feature',
  geometry,
  properties: { LABEL: label, ISSUE_ISO: issue },
})

describe('diffNwsAlerts', () => {
  it('seeds on first load and returns nothing', () => {
    const events = diffNwsAlerts(null, [alert({ id: 'a', eventKey: 'KCHS.TO.W.1' })], aoi, NOW)
    expect(events).toEqual([])
  })

  it('emits one event for a new in-AOI tornado warning', () => {
    const seen: Seen = new Set<string>()
    const events = diffNwsAlerts(seen, [alert({ id: 'a', eventKey: 'KCHS.TO.W.1' })], aoi, NOW)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      kind: 'nws-alert',
      key: 'KCHS.TO.W.1',
      title: 'TORNADO WARNING · Bulloch, GA',
      body: 'Bulloch, GA until 18:45Z.',
      level: 'TOR',
      at: NOW,
      focus: { id: 'a' },
    })
  })

  it('gives a focus bbox for a polygon and none for a zone alert', () => {
    const seen = new Set<string>()
    const [withPolygon] = diffNwsAlerts(seen, [alert({ id: 'p', eventKey: 'K.1' })], aoi, NOW)
    expect(withPolygon.focus?.bbox.west).toBeCloseTo(-81.7)
    const [zoneOnly] = diffNwsAlerts(seen, [alert({ id: 'z', eventKey: 'K.2', geometry: null })], aoi, NOW)
    expect(zoneOnly.focus).toBeUndefined()
  })

  it('does not re-notify the same eventKey with a new id (an update)', () => {
    const seen = new Set(['KCHS.TO.W.1'])
    expect(diffNwsAlerts(seen, [alert({ id: 'newer', eventKey: 'KCHS.TO.W.1' })], aoi, NOW)).toEqual([])
  })

  it('ignores warnings outside the AOI', () => {
    const seen = new Set<string>()
    expect(diffNwsAlerts(seen, [alert({ id: 'o', eventKey: 'K.9', geometry: OUTSIDE, states: ['NY'] })], aoi, NOW)).toEqual(
      [],
    )
  })

  it('ignores cancellations', () => {
    const seen = new Set<string>()
    expect(diffNwsAlerts(seen, [alert({ id: 'c', eventKey: 'K.3', messageType: 'Cancel' })], aoi, NOW)).toEqual([])
  })

  it('leaves watches to the SPC watch trigger', () => {
    const seen = new Set<string>()
    const tornadoWatch = alert({ id: 'w', eventKey: 'K.W', event: 'Tornado Watch', geometry: null })
    expect(diffNwsAlerts(seen, [tornadoWatch], aoi, NOW)).toEqual([])
  })

  it('tags a severe thunderstorm warning with its own level', () => {
    const seen = new Set<string>()
    const [event] = diffNwsAlerts(seen, [alert({ id: 's', eventKey: 'K.S', event: 'Severe Thunderstorm Warning' })], aoi, NOW)
    expect(event).toMatchObject({ title: 'SEVERE THUNDERSTORM WARNING · Bulloch, GA', level: 'SVR' })
  })
})

describe('diffSpcWatches', () => {
  it('emits a new watch whose box meets the AOI, and not one that does not', () => {
    const seen = new Set<string>()
    const events = diffSpcWatches(seen, [watch(101, INSIDE_WATCH), watch(102, OUTSIDE_WATCH, 'SVR')], aoi, NOW)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'spc-watch', key: 'spc-watch:101', level: 'TOA', title: 'TORNADO WATCH 101' })
  })

  it('seeds and never repeats a watch number', () => {
    expect(diffSpcWatches(null, [watch(101, INSIDE_WATCH)], aoi, NOW)).toEqual([])
    expect(diffSpcWatches(new Set(['spc-watch:101']), [watch(101, INSIDE_WATCH)], aoi, NOW)).toEqual([])
  })
})

describe('diffSpcMds', () => {
  it('emits a new mesoscale discussion that intersects the AOI', () => {
    const seen = new Set<string>()
    const events = diffSpcMds(seen, [md(1234, INSIDE), md(1235, OUTSIDE)], aoi, NOW)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'spc-md', key: 'spc-md:1234', level: 'MD', title: 'MESOSCALE DISCUSSION 1234' })
  })
})

describe('diffRiskUpgrade', () => {
  const issueA = '2026-10-11T16:29:00+00:00'
  const issueB = '2026-10-11T20:01:00+00:00'

  it('seeds on the first call', () => {
    expect(diffRiskUpgrade(null, [risk('SLGT', issueA)], aoi, NOW)).toEqual([])
  })

  it('emits when the AOI category rises on a new issuance', () => {
    const prev = [risk('MRGL', issueA)]
    const next = [risk('SLGT', issueB)]
    const events = diffRiskUpgrade(prev, next, aoi, NOW)
    expect(events).toEqual([
      expect.objectContaining({
        kind: 'spc-risk',
        key: `spc-risk:${issueB}`,
        title: 'SPC D1 UPGRADED TO SLGT',
        level: 'SLGT',
      }),
    ])
  })

  it('emits SLGT to ENH on a new issuance', () => {
    const events = diffRiskUpgrade([risk('SLGT', issueA)], [risk('ENH', issueB)], aoi, NOW)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('SPC D1 UPGRADED TO ENH')
  })

  it('does nothing for the same issuance', () => {
    expect(diffRiskUpgrade([risk('SLGT', issueA)], [risk('ENH', issueA)], aoi, NOW)).toEqual([])
  })

  it('does nothing for a downgrade', () => {
    expect(diffRiskUpgrade([risk('ENH', issueA)], [risk('SLGT', issueB)], aoi, NOW)).toEqual([])
  })

  it('ignores a rise that is outside the AOI', () => {
    const outside = { type: 'Polygon' as const, coordinates: OUTSIDE.coordinates }
    const events = diffRiskUpgrade([risk('MRGL', issueA, outside)], [risk('ENH', issueB, outside)], aoi, NOW)
    expect(events).toEqual([])
  })
})

describe('remember', () => {
  it('adds keys without changing the set it was given', () => {
    const before = new Set(['a'])
    const after = remember(before, ['b'])
    expect([...after].sort()).toEqual(['a', 'b'])
    expect([...before]).toEqual(['a'])
  })

  it('starts from nothing when there is no seen set yet', () => {
    expect([...remember(null, ['x'])]).toEqual(['x'])
  })
})
