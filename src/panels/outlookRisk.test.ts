import { describe, expect, it } from 'vitest'
import type { Bbox } from '../types'
import { highestCategory, riskSummary } from './outlookRisk'

const AOI: Bbox = { west: -85, south: 30, east: -80, north: 35 }

/** Square ring around a centre point, in [lng, lat]. */
function square(lng: number, lat: number, half = 0.5): number[][] {
  return [
    [lng - half, lat - half],
    [lng + half, lat - half],
    [lng + half, lat + half],
    [lng - half, lat + half],
    [lng - half, lat - half],
  ]
}

function feature(label: string, ring: number[][]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { LABEL: label },
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

describe('highestCategory', () => {
  it('ignores a polygon that lies outside the bbox', () => {
    const far = feature('HIGH', square(-120, 40))
    expect(highestCategory([far], AOI)).toBeNull()
  })

  it('reports TSTM when only the general-thunderstorm area touches the AOI', () => {
    const tstm = feature('TSTM', square(-82.5, 32.5, 2))
    const outside = feature('MDT', square(-120, 40))
    expect(highestCategory([tstm, outside], AOI)).toBe('TSTM')
  })

  it('reports MDT when a moderate-risk polygon is inside the AOI, above a TSTM area', () => {
    const features = [feature('TSTM', square(-82.5, 32.5, 2)), feature('MDT', square(-82.5, 32.5, 0.5))]
    expect(highestCategory(features, AOI)).toBe('MDT')
  })

  it('is null for no features', () => {
    expect(highestCategory([], AOI)).toBeNull()
  })
})

describe('riskSummary', () => {
  it('always includes Day 1, even when there is no risk', () => {
    expect(riskSummary(null, null, null)).toEqual([{ day: 1, label: null }])
  })

  it('adds Day 2 or Day 3 only when higher than every earlier day', () => {
    expect(riskSummary('SLGT', 'SLGT', 'ENH')).toEqual([
      { day: 1, label: 'SLGT' },
      { day: 3, label: 'ENH' },
    ])
    expect(riskSummary('MRGL', 'ENH', 'MDT')).toEqual([
      { day: 1, label: 'MRGL' },
      { day: 2, label: 'ENH' },
      { day: 3, label: 'MDT' },
    ])
  })

  it('omits a later day that does not exceed an earlier one', () => {
    expect(riskSummary('SLGT', 'ENH', 'ENH')).toEqual([
      { day: 1, label: 'SLGT' },
      { day: 2, label: 'ENH' },
    ])
    expect(riskSummary('MDT', 'SLGT', 'HIGH')).toEqual([
      { day: 1, label: 'MDT' },
      { day: 3, label: 'HIGH' },
    ])
  })

  it('shows a Day 2 risk when Day 1 is empty', () => {
    expect(riskSummary(null, 'TSTM', null)).toEqual([
      { day: 1, label: null },
      { day: 2, label: 'TSTM' },
    ])
  })
})
