import { describe, expect, it } from 'vitest'
import {
  alertDurationMs,
  alertsView,
  formatAge,
  formatCountdown,
  formatZulu,
  geometryBbox,
  isListed,
  remainingFraction,
  remainingMs,
} from './alertGeometry'

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

describe('remainingMs / alertDurationMs', () => {
  const now = Date.parse('2026-10-10T20:00:00Z')

  it('is null without an expiry and negative once past', () => {
    expect(remainingMs(null, now)).toBeNull()
    expect(remainingMs('2026-10-10T19:59:00Z', now)).toBeLessThan(0)
  })

  it('measures the onset→expires window, or null when either end is missing', () => {
    expect(alertDurationMs('2026-10-10T19:00:00Z', '2026-10-10T20:45:00Z')).toBe(105 * 60_000)
    expect(alertDurationMs(null, '2026-10-10T20:45:00Z')).toBeNull()
    expect(alertDurationMs('2026-10-10T19:00:00Z', null)).toBeNull()
  })
})

describe('formatCountdown', () => {
  it('formats as T-mm:ss with zero padding under an hour', () => {
    expect(formatCountdown(9 * 60_000 + 5_000)).toBe('T-09:05')
    expect(formatCountdown(59 * 60_000 + 59_000)).toBe('T-59:59')
  })

  it('switches to T-h:mm:ss from one hour', () => {
    expect(formatCountdown(60 * 60_000)).toBe('T-1h00')
    expect(formatCountdown(75 * 60_000)).toBe('T-1h15')
    expect(formatCountdown(3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe('T-3h04')
  })

  it('clamps at zero', () => {
    expect(formatCountdown(-1000)).toBe('T-00:00')
  })
})

describe('remainingFraction', () => {
  it('is the remaining share of the window, clamped to 0..1', () => {
    expect(remainingFraction(30 * 60_000, 60 * 60_000)).toBe(0.5)
    expect(remainingFraction(-5_000, 60 * 60_000)).toBe(0)
    expect(remainingFraction(90 * 60_000, 60 * 60_000)).toBe(1)
  })

  it('is null when the window is unknown or empty', () => {
    expect(remainingFraction(1000, null)).toBeNull()
    expect(remainingFraction(1000, 0)).toBeNull()
  })
})

describe('isListed (expired retention)', () => {
  it('keeps active, open-ended and rows expired less than 60 s ago', () => {
    expect(isListed(null)).toBe(true)
    expect(isListed(1_000)).toBe(true)
    expect(isListed(0)).toBe(true)
    expect(isListed(-59_000)).toBe(true)
  })

  it('drops rows expired 60 s or more ago', () => {
    expect(isListed(-60_000)).toBe(false)
    expect(isListed(-120_000)).toBe(false)
  })
})

describe('alertsView (error / last-known chooser)', () => {
  it('shows live rows, or the empty state only when the feed is healthy', () => {
    expect(alertsView({ isError: false, hasData: true, rows: 2 })).toBe('live')
    expect(alertsView({ isError: false, hasData: true, rows: 0 })).toBe('empty')
  })

  it('shows degraded (banner + last-known rows) when an error follows good data', () => {
    expect(alertsView({ isError: true, hasData: true, rows: 3 })).toBe('degraded')
    expect(alertsView({ isError: true, hasData: true, rows: 0 })).toBe('degraded')
  })

  it('never shows the empty state while in error', () => {
    expect(alertsView({ isError: true, hasData: false, rows: 0 })).toBe('unavailable')
  })
})

describe('formatAge / formatZulu', () => {
  it('formats the header age in seconds, then minutes', () => {
    expect(formatAge(42_000)).toBe('42s')
    expect(formatAge(5 * 60_000 + 7_000)).toBe('5m07s')
    expect(formatAge(-1)).toBe('--')
  })

  it('formats UTC times as HH:mm:ssZ, or a placeholder when unknown', () => {
    expect(formatZulu(Date.parse('2026-10-10T21:47:12Z'))).toBe('21:47:12Z')
    expect(formatZulu(null)).toBe('--:--:--Z')
  })
})
