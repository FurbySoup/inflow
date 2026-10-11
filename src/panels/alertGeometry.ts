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

/** Onset→expires window in ms for the remaining-time bar, or null when either end is missing. */
export function alertDurationMs(onset: string | null, expires: string | null): number | null {
  if (!onset || !expires) return null
  return Date.parse(expires) - Date.parse(onset)
}

/** Expired rows stay listed this long (ms) at 60% opacity, then leave (INFLOW §6). */
export const EXPIRED_RETENTION_MS = 60_000

/** True while a row should still be listed: no expiry, still active, or expired less than the retention window ago. */
export function isListed(left: number | null): boolean {
  return left === null || left > -EXPIRED_RETENTION_MS
}

export type AlertsView = 'live' | 'empty' | 'degraded' | 'unavailable'

/**
 * Which body the alerts panel renders. A failed feed is never "empty": with last-good data it is `degraded`
 * (banner + last-known rows), with none it is `unavailable` (banner only).
 */
export function alertsView(state: { isError: boolean; hasData: boolean; rows: number }): AlertsView {
  if (state.isError) return state.hasData ? 'degraded' : 'unavailable'
  return state.rows > 0 ? 'live' : 'empty'
}

/** Header age since the last successful fetch: `Ns` under a minute, else `Xm YYs`. `--` when there has been none. */
export function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '--'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

/** `T-mm:ss` / `T-h:mm:ss` countdown and `HH:mm:ssZ` times, shared with the kit. */
export { formatCountdown, formatZulu, remainingFraction } from '../ui/AlertList'
