import type { Bbox } from '../../types'
import type { SourceAdapter } from '../types'

// Same proxy as alerts.ts: /api/nws adds the NWS User-Agent.
const BASE = '/api/nws'

export interface NwsPointResponse {
  properties: {
    cwa: string
    timeZone: string
    radarStation: string
    relativeLocation?: { properties?: { city?: string; state?: string } }
  }
}

/** Null when NWS has no point there (offshore: /points answers HTTP 500, which is not an error state). */
export type NwsPointRaw = NwsPointResponse | null

export interface NwsPoint {
  cwa: string
  timeZone: string
  radarStation: string
  place: string | null
}

const round1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1)

/** AOI centre rounded to 0.1°, so small pans share one key (and one request). */
export function centreKey(aoi: Bbox): string {
  return `${round1((aoi.south + aoi.north) / 2)},${round1((aoi.west + aoi.east) / 2)}`
}

// Resolved successes only: NWS offshore/transient failures are re-asked on the next poll or pan.
const cache = new Map<string, NwsPointResponse>()

export const nwsPoint: SourceAdapter<NwsPointRaw, NwsPoint> = {
  id: 'nws-point',
  refreshMs: 6 * 60 * 60 * 1000,
  async fetch(aoi, signal) {
    const key = centreKey(aoi)
    const hit = cache.get(key)
    if (hit) return hit
    const res = await fetch(`${BASE}/points/${key}`, {
      signal,
      headers: { Accept: 'application/geo+json' },
    })
    if (!res.ok) return null
    const body = (await res.json()) as NwsPointResponse
    cache.set(key, body)
    return body
  },
  normalize(raw) {
    if (!raw) return []
    const p = raw.properties
    const rel = p.relativeLocation?.properties
    return [
      {
        cwa: p.cwa,
        timeZone: p.timeZone,
        radarStation: p.radarStation,
        place: rel?.city && rel.state ? `${rel.city}, ${rel.state}` : null,
      },
    ]
  },
}
