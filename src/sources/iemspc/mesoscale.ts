import type { SourceAdapter } from '../types'
import { isActive } from './expiry'

// IEM mirrors SPC's mesoscale discussions as GeoJSON (CORS *). Poll every 2–5 min.
export const SPC_MCD_URL = 'https://mesonet.agron.iastate.edu/api/1/nws/spc_mcd.geojson'

export interface MesoscaleProps {
  num: number
  label: string
  expires: string
  kind: 'MD'
}

export type MesoscaleFeature = GeoJSON.Feature<GeoJSON.Polygon, MesoscaleProps>

interface McdProperties {
  num?: unknown
  expire?: unknown
}

/** Pure: keeps only discussions still active at `now` (epoch ms) and trims them to the labelled shape. */
export function normalizeMesoscale(raw: GeoJSON.FeatureCollection, now: number): MesoscaleFeature[] {
  const out: MesoscaleFeature[] = []
  for (const f of raw.features) {
    const p = f.properties as McdProperties | null
    if (!p || f.geometry?.type !== 'Polygon') continue
    if (typeof p.num !== 'number' || typeof p.expire !== 'string') continue
    if (!isActive(p.expire, now)) continue
    out.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: { num: p.num, label: `MD ${p.num}`, expires: p.expire, kind: 'MD' },
    })
  }
  return out
}

export interface MesoscaleRaw {
  data: GeoJSON.FeatureCollection
  /** When the feed was fetched; expiry is judged against this, keeping normalize pure. */
  fetchedAt: string
}

export const spcMesoscale: SourceAdapter<MesoscaleRaw, MesoscaleFeature> = {
  id: 'spc-mesoscale',
  refreshMs: 180_000,
  async fetch(_aoi, signal) {
    const res = await fetch(SPC_MCD_URL, { signal })
    if (!res.ok) throw new Error(`SPC mesoscale discussions ${res.status}`)
    return { data: await res.json(), fetchedAt: new Date().toISOString() }
  },
  normalize(raw) {
    return normalizeMesoscale(raw.data, Date.parse(raw.fetchedAt))
  },
}
