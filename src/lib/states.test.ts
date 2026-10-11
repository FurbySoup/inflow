import { describe, expect, it } from 'vitest'
import { statesInBbox } from './states'

describe('statesInBbox', () => {
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
})
