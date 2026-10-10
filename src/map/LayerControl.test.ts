import { describe, expect, it } from 'vitest'
import { layerMatches } from './LayerControl'

describe('layerMatches', () => {
  it('matches every style layer whose id starts with the overlay id', () => {
    expect(layerMatches('radar-m50', 'radar')).toBe(true)
    expect(layerMatches('radar-m00', 'radar')).toBe(true)
    expect(layerMatches('spc-outlook-line', 'spc-outlook')).toBe(true)
    expect(layerMatches('alerts-fill', 'alerts')).toBe(true)
  })

  it('does not match unrelated or shorter ids', () => {
    expect(layerMatches('satellite', 'radar')).toBe(false)
    expect(layerMatches('radar', 'radar-m50')).toBe(false)
    expect(layerMatches('storm-reports', 'alerts')).toBe(false)
  })
})
