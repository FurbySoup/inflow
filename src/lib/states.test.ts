import { describe, expect, it } from 'vitest'
import { STATE_CODES, stateAt, statesInBbox } from './states'

describe('statesInBbox', () => {
  it('covers the 50 states, DC and PR', () => {
    expect(STATE_CODES).toHaveLength(52)
    expect(STATE_CODES).toEqual(expect.arrayContaining(['AK', 'HI', 'DC', 'PR', 'ME', 'WA', 'OH']))
  })

  it('finds the Dixie Alley core states', () => {
    const dixie = { west: -94, south: 29.5, east: -84.5, north: 37 }
    expect(statesInBbox(dixie)).toEqual(expect.arrayContaining(['LA', 'MS', 'AL', 'TN', 'AR']))
  })

  it('keeps the default GA/SC AOI to its neighbourhood', () => {
    const states = statesInBbox({ west: -85.6, south: 30.4, east: -78.5, north: 35.3 })
    expect(states).toEqual(expect.arrayContaining(['GA', 'SC']))
    expect(states).not.toContain('LA')
    expect(states).not.toContain('TX')
  })

  it('covers the states the old 20-state table missed', () => {
    // Chicago to Columbus, the Twin Cities, central Pennsylvania, Seattle, Boston.
    expect(statesInBbox({ west: -88.5, south: 39.5, east: -82.5, north: 41.5 })).toEqual(['IL', 'IN', 'OH'])
    expect(statesInBbox({ west: -93.6, south: 44.7, east: -92.9, north: 45.2 })).toEqual(['MN'])
    expect(statesInBbox({ west: -78.5, south: 40.2, east: -77, north: 41.2 })).toEqual(['PA'])
    expect(statesInBbox({ west: -122.6, south: 47.3, east: -122, north: 47.8 })).toEqual(['WA'])
    expect(statesInBbox({ west: -71.3, south: 42.2, east: -70.9, north: 42.5 })).toEqual(['MA'])
  })

  it('uses the shapes, not bounding boxes: a corner AOI does not pick up a diagonal neighbour', () => {
    // South-west Kansas. Colorado's and Oklahoma's boxes are near, but only Kansas land is inside.
    expect(statesInBbox({ west: -101.5, south: 37.2, east: -100.5, north: 37.8 })).toEqual(['KS'])
  })

  it('finds an AOI drawn entirely inside one state, and a state drawn entirely inside the AOI', () => {
    expect(statesInBbox({ west: -98, south: 38.5, east: -97.9, north: 38.6 })).toEqual(['KS'])
    expect(statesInBbox({ west: -77.2, south: 38.7, east: -76.8, north: 39.1 })).toEqual(
      expect.arrayContaining(['DC', 'MD', 'VA']),
    )
  })

  it('finds Puerto Rico and returns nothing over open ocean', () => {
    expect(statesInBbox({ west: -67.5, south: 17.8, east: -65.5, north: 18.6 })).toEqual(['PR'])
    expect(statesInBbox({ west: -60, south: 30, east: -55, north: 35 })).toEqual([])
  })
})

describe('stateAt', () => {
  it('places points in New England states and returns null at sea', () => {
    expect(stateAt(-71.46, 43.0)).toBe('NH') // Manchester
    expect(stateAt(-73.21, 44.48)).toBe('VT') // Burlington
    expect(stateAt(-70.26, 43.66)).toBe('ME') // Portland
    expect(stateAt(-65, 40)).toBeNull()
  })
})
