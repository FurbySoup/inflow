import { describe, expect, it } from 'vitest'
import { AOI_PRESETS, matchPreset } from './aoiPresetData'
import type { Bbox } from '../types'

const byId = (id: string) => {
  const p = AOI_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`no preset ${id}`)
  return p.bbox
}

// Expand a bbox symmetrically about its centre, as fitBounds does for a different aspect ratio.
const scale = (b: Bbox, fx: number, fy: number): Bbox => {
  const cx = (b.west + b.east) / 2
  const cy = (b.south + b.north) / 2
  const hw = ((b.east - b.west) / 2) * fx
  const hh = ((b.north - b.south) / 2) * fy
  return { west: cx - hw, east: cx + hw, south: cy - hh, north: cy + hh }
}

const shift = (b: Bbox, dx: number, dy: number): Bbox => ({
  west: b.west + dx,
  east: b.east + dx,
  south: b.south + dy,
  north: b.north + dy,
})

describe('matchPreset', () => {
  it('matches each preset exactly', () => {
    expect(matchPreset(byId('plains'))).toBe('plains')
    expect(matchPreset(byId('dixie'))).toBe('dixie')
    expect(matchPreset(byId('southeast'))).toBe('southeast')
  })

  it('matches the default AOI as southeast', () => {
    expect(matchPreset({ west: -85.6, south: 30.4, east: -78.5, north: 35.3 })).toBe('southeast')
  })

  it('still matches a view widened to a taller aspect ratio (phone portrait)', () => {
    expect(matchPreset(scale(byId('dixie'), 1, 2))).toBe('dixie')
  })

  it('still matches a tall preset fitted to a wide desktop map', () => {
    // Plains (10° x 12°) on a 952x484 map: height fits, width expands ~3x. Live check 2026-10-11.
    expect(matchPreset(scale(byId('plains'), 3.2, 1.05))).toBe('plains')
  })

  it('still matches a view zoomed out by 1.5x per axis', () => {
    expect(matchPreset(scale(byId('plains'), 1.5, 1.5))).toBe('plains')
  })

  it('misses after a manual pan', () => {
    expect(matchPreset(shift(byId('dixie'), 1.5, 0))).toBeNull()
    expect(matchPreset(shift(byId('southeast'), 0, -1))).toBeNull()
  })

  it('misses after zooming in past the region edges', () => {
    expect(matchPreset(scale(byId('plains'), 0.5, 0.5))).toBeNull()
  })

  it('misses after zooming out well beyond the region', () => {
    expect(matchPreset(scale(byId('dixie'), 2, 2))).toBeNull()
  })

  it('misses an unrelated view', () => {
    expect(matchPreset({ west: -120, south: 35, east: -115, north: 40 })).toBeNull()
  })
})

describe('AOI_PRESETS', () => {
  // Rough CONUS envelope: every preset must sit inside the lower 48.
  const CONUS = { west: -125, east: -66.5, south: 24.5, north: 49.5 }

  it('lie within the US', () => {
    for (const p of AOI_PRESETS) {
      expect(p.bbox.west, p.id).toBeGreaterThanOrEqual(CONUS.west)
      expect(p.bbox.east, p.id).toBeLessThanOrEqual(CONUS.east)
      expect(p.bbox.south, p.id).toBeGreaterThanOrEqual(CONUS.south)
      expect(p.bbox.north, p.id).toBeLessThanOrEqual(CONUS.north)
      expect(p.bbox.west, p.id).toBeLessThan(p.bbox.east)
      expect(p.bbox.south, p.id).toBeLessThan(p.bbox.north)
    }
  })

  it('have unique ids', () => {
    expect(new Set(AOI_PRESETS.map((p) => p.id)).size).toBe(AOI_PRESETS.length)
  })
})
