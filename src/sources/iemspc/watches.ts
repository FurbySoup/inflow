import type { SourceAdapter } from '../types'
import { isActive } from './expiry'

// IEM mirrors SPC's watch boxes as GeoJSON (CORS *). Poll every 2–5 min.
export const SPC_WATCH_URL = 'https://mesonet.agron.iastate.edu/api/1/spc_watch_outline.geojson'

export type WatchKind = 'TOR' | 'SVR'

export interface WatchProps {
  num: number
  label: string
  expires: string
  kind: WatchKind
}

export type WatchFeature = GeoJSON.Feature<GeoJSON.MultiPolygon, WatchProps>

interface WatchOutlineProperties {
  type?: unknown
  num?: unknown
  utc_expired?: unknown
}

/** Pure: keeps only TOR/SVR watches still active at `now` (epoch ms) and trims them to the labelled shape. */
export function normalizeWatches(raw: GeoJSON.FeatureCollection, now: number): WatchFeature[] {
  const out: WatchFeature[] = []
  for (const f of raw.features) {
    const p = f.properties as WatchOutlineProperties | null
    if (!p || f.geometry?.type !== 'MultiPolygon') continue
    if (p.type !== 'TOR' && p.type !== 'SVR') continue
    if (typeof p.num !== 'number' || typeof p.utc_expired !== 'string') continue
    if (!isActive(p.utc_expired, now)) continue
    out.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        num: p.num,
        label: `${p.type} ${p.num}`,
        expires: p.utc_expired,
        kind: p.type,
      },
    })
  }
  return out
}

export const spcWatchBoxes: SourceAdapter<GeoJSON.FeatureCollection, WatchFeature> = {
  id: 'spc-watch-boxes',
  refreshMs: 180_000,
  async fetch(_aoi, signal) {
    const res = await fetch(SPC_WATCH_URL, { signal })
    if (!res.ok) throw new Error(`SPC watch boxes ${res.status}`)
    return res.json()
  },
  normalize(raw, now = Date.now()) {
    return normalizeWatches(raw, now)
  },
}
