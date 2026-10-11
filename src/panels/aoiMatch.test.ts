import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import { alertInAoi } from './aoiMatch'

const AOI = {
  bbox: { west: -85.6, south: 30.4, east: -78.5, north: 35.3 },
  states: ['GA', 'SC'],
}

// Tight box around Atlanta, used to put a same-state polygon outside the AOI.
const ATLANTA_ONLY = { west: -84.6, south: 33.6, east: -84.2, north: 33.9 }

const square = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
})

const alert = (over: Partial<Pick<Alert, 'geometry' | 'states'>>): Pick<Alert, 'geometry' | 'states'> => ({
  geometry: null,
  states: ['GA'],
  ...over,
})

describe('alertInAoi', () => {
  it('matches a polygon inside the bbox', () => {
    expect(alertInAoi(alert({ geometry: square(-81.8, 32.6, -81.6, 32.8) }), AOI)).toBe(true)
  })

  it('does not match a polygon in the same state but outside the bbox', () => {
    const savannah = square(-81.2, 32.0, -81.0, 32.2)
    expect(alertInAoi(alert({ geometry: savannah, states: ['GA'] }), { ...AOI, bbox: ATLANTA_ONLY })).toBe(false)
  })

  it('matches a polygon that straddles the bbox edge', () => {
    // Crosses the west edge (-85.6) of the AOI: the vertices are both outside, the edge crosses through.
    expect(alertInAoi(alert({ geometry: square(-86.0, 31.0, -85.0, 32.0) }), AOI)).toBe(true)
  })

  it('matches a null-geometry watch by state', () => {
    expect(alertInAoi(alert({ geometry: null, states: ['SC'] }), AOI)).toBe(true)
    expect(alertInAoi(alert({ geometry: null, states: ['AL'] }), AOI)).toBe(false)
  })

  it('matches a MultiPolygon when one part is inside the bbox', () => {
    const multi = {
      type: 'MultiPolygon' as const,
      coordinates: [
        square(-70.0, 40.0, -69.9, 40.1).coordinates,
        square(-81.8, 32.6, -81.6, 32.8).coordinates,
      ],
    }
    expect(alertInAoi(alert({ geometry: multi }), AOI)).toBe(true)
  })

  it('does not match a MultiPolygon with every part outside the bbox', () => {
    const multi = {
      type: 'MultiPolygon' as const,
      coordinates: [square(-70.0, 40.0, -69.9, 40.1).coordinates],
    }
    expect(alertInAoi(alert({ geometry: multi }), AOI)).toBe(false)
  })
})
