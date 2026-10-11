import { IEM_TILE_BASE } from '../radar/iem'

// Storm-relative velocity (SRV) from a single site. N0U and N0Q are stale on IEM (no scans since 2023),
// so only N0S is used.
export const SRV_PRODUCT = 'N0S'

/** A site is shown as stale when its newest scan is older than this. IEM serves old products with 200. */
export const SRV_STALE_MS = 20 * 60_000

export const RIDGE_CURRENT_URL = `https://mesonet.agron.iastate.edu/json/ridge_current.py?product=${SRV_PRODUCT}`

/** One row of `ridge_current.py`: the newest scan for one site. */
export interface RidgeMetaEntry {
  /** ISO-8601 UTC scan time, e.g. `2026-10-11T15:32:36Z`. */
  valid: string
  product: string
  site: string
  vcp: number
}

/** SRV tile URL for one site. `bustKey` adds a query so a refresh re-requests the tiles. */
export function srvTileUrl(sid: string, bustKey?: number): string {
  const query = bustKey === undefined ? '' : `?t=${bustKey}`
  return `${IEM_TILE_BASE}ridge::${sid}-${SRV_PRODUCT}-0/{z}/{x}/{y}.png${query}`
}

/** Newest scan time (ISO) for `sid`, or null when the site is missing or its time is malformed. */
export function siteValid(meta: readonly RidgeMetaEntry[], sid: string): string | null {
  const entry = meta.find((m) => m.site === sid)
  if (!entry || Number.isNaN(Date.parse(entry.valid))) return null
  return entry.valid
}

/** True when the ISO scan time is more than SRV_STALE_MS before `nowMs`. */
export function isStale(valid: string, nowMs: number): boolean {
  return nowMs - Date.parse(valid) > SRV_STALE_MS
}

/** The per-site list from `ridge_current.py` (one entry per radar). */
export async function fetchRidgeMeta(signal?: AbortSignal): Promise<RidgeMetaEntry[]> {
  const res = await fetch(RIDGE_CURRENT_URL, { signal })
  if (!res.ok) throw new Error(`IEM ridge_current ${res.status}`)
  const json = (await res.json()) as { meta?: unknown }
  if (!Array.isArray(json.meta)) throw new Error('IEM ridge_current: no meta[]')
  return json.meta as RidgeMetaEntry[]
}
