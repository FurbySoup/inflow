import { describe, expect, it } from 'vitest'
import ridgeJson from './fixtures/ridge-current.json'
import { isStale, siteValid, srvTileUrl, SRV_STALE_MS } from './srv'

const meta = ridgeJson.meta
const NOW = Date.parse('2026-10-11T15:40:00Z')

describe('siteValid', () => {
  it('returns the newest scan time for a site in the fixture', () => {
    expect(siteValid(meta, 'FFC')).toBe('2026-10-11T15:32:36Z')
    expect(siteValid(meta, 'TLX')).toBe('2026-10-11T15:32:37Z')
  })

  it('returns null for a site that is not in the list', () => {
    expect(siteValid(meta, 'XXX')).toBeNull()
  })

  it('returns null when the time is malformed', () => {
    expect(siteValid([{ valid: 'not-a-date', product: 'N0S', site: 'FFC', vcp: 35 }], 'FFC')).toBeNull()
  })
})

describe('isStale', () => {
  it('is fresh within 20 minutes and stale beyond it', () => {
    expect(SRV_STALE_MS).toBe(20 * 60_000)
    // NOW is 15:40: a 15:32 scan (FFC) is 8 min old, a 15:21 scan is 19 min old, a 15:19 scan is 21 min old.
    expect(isStale('2026-10-11T15:32:36Z', NOW)).toBe(false)
    expect(isStale('2026-10-11T15:21:00Z', NOW)).toBe(false)
    expect(isStale('2026-10-11T15:19:00Z', NOW)).toBe(true)
  })

  it('marks the 2023 scan (LIX, served with 200 by IEM) as stale', () => {
    expect(siteValid(meta, 'LIX')).toBe('2023-11-27T13:43:17Z')
    expect(isStale('2023-11-27T13:43:17Z', NOW)).toBe(true)
  })
})

describe('srvTileUrl', () => {
  it('builds the N0S ridge tile URL for a site', () => {
    expect(srvTileUrl('FFC')).toBe(
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::FFC-N0S-0/{z}/{x}/{y}.png',
    )
  })

  it('adds a cache-bust query when given a key', () => {
    expect(srvTileUrl('TLX', 123)).toBe(
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::TLX-N0S-0/{z}/{x}/{y}.png?t=123',
    )
  })
})
