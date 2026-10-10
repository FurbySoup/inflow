import { describe, expect, it } from 'vitest'
import { formatRemaining, geometryBbox, isEmergencyWarning, remainingMs } from './alertGeometry'

describe('geometryBbox', () => {
  it('covers a single polygon', () => {
    const bbox = geometryBbox({
      type: 'Polygon',
      coordinates: [[[-81.7, 32.7], [-81.5, 32.7], [-81.5, 32.9], [-81.7, 32.7]]],
    })
    expect(bbox).toEqual({ west: -81.7, south: 32.7, east: -81.5, north: 32.9 })
  })

  it('covers every polygon of a multipolygon', () => {
    const bbox = geometryBbox({
      type: 'MultiPolygon',
      coordinates: [
        [[[-82, 33], [-81.9, 33], [-81.9, 33.1], [-82, 33]]],
        [[[-80.5, 31], [-80.4, 31], [-80.4, 31.2], [-80.5, 31]]],
      ],
    })
    expect(bbox).toEqual({ west: -82, south: 31, east: -80.4, north: 33.1 })
  })

  it('returns null for zone alerts and non-area geometry', () => {
    expect(geometryBbox(null)).toBeNull()
    expect(geometryBbox({ type: 'Point', coordinates: [-81, 32] })).toBeNull()
  })
})

describe('remainingMs / formatRemaining', () => {
  const now = Date.parse('2026-10-10T20:00:00Z')

  it('is null without an expiry and negative once past', () => {
    expect(remainingMs(null, now)).toBeNull()
    expect(remainingMs('2026-10-10T19:59:00Z', now)).toBeLessThan(0)
  })

  it('formats as T-mm:ss with zero padding', () => {
    expect(formatRemaining(9 * 60_000 + 5_000)).toBe('T-09:05')
    expect(formatRemaining(75 * 60_000)).toBe('T-75:00')
    expect(formatRemaining(-1000)).toBe('T-00:00')
  })
})

describe('isEmergencyWarning', () => {
  it('flags tornado warnings with PDS or emergency in the headline only', () => {
    expect(isEmergencyWarning('Tornado Warning', 'Tornado Warning (PDS) issued for Bibb County')).toBe(true)
    expect(isEmergencyWarning('Tornado Warning', 'TORNADO EMERGENCY for Macon')).toBe(true)
    expect(isEmergencyWarning('Tornado Warning', 'Tornado Warning issued for Bibb County')).toBe(false)
    expect(isEmergencyWarning('Severe Thunderstorm Warning', 'Emergency management notice')).toBe(false)
  })
})
