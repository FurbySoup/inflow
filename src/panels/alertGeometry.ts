import type { Bbox } from '../types'

const EMPTY_BBOX: Bbox = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity }

/** Bounding box of a Polygon or MultiPolygon. Null for anything else (including null geometry, i.e. zone alerts). */
export function geometryBbox(geometry: GeoJSON.Geometry | null): Bbox | null {
  if (!geometry) return null
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null
  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
  const bbox = { ...EMPTY_BBOX }
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      bbox.west = Math.min(bbox.west, lng)
      bbox.east = Math.max(bbox.east, lng)
      bbox.south = Math.min(bbox.south, lat)
      bbox.north = Math.max(bbox.north, lat)
    }
  }
  return Number.isFinite(bbox.west) ? bbox : null
}

/** Milliseconds until `expires` (ISO), or null when the alert has no expiry. Negative once expired. */
export function remainingMs(expires: string | null, now: number): number | null {
  if (!expires) return null
  return Date.parse(expires) - now
}

/** Formats a remaining duration as `T-mm:ss`. Minutes are not wrapped at 60. */
export { formatRemaining } from '../ui/format'

/** Tornado warnings flagged as particularly dangerous (PDS) or emergencies get a flashing border. */
export function isEmergencyWarning(event: string, headline: string): boolean {
  return event === 'Tornado Warning' && (/\bPDS\b/.test(headline) || /emergency/i.test(headline))
}
