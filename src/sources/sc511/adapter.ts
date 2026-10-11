import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'

// 511SC (South Carolina) runs Iteris ATIS "SafeTravel4", not CARS. Verified 2026-10-10: one GeoJSON file
// with all ~789 cameras, no bbox query, no clustering. No CORS, so it goes through the /api/511sc proxy (ADR-0005).
const LIST_PATH = '/api/511sc/geojson/icons/metadata/icons.cameras.geojson'
// The list is ~695 KB and changes slowly, so it is cached in memory; the AOI filter runs in normalize.
const LIST_CACHE_MS = 15 * 60_000

export interface Sc511Feature {
  geometry: { type: string; coordinates: number[] }
  properties: {
    id: string
    name: string
    description: string | null
    route: string | null
    direction: string | null
    active: boolean
    image_url: string
  }
}

export interface Sc511Collection {
  type: string
  features: Sc511Feature[]
}

export interface Sc511Raw {
  bbox: Bbox
  features: Sc511Feature[]
}

export interface Sc511Adapter extends SourceAdapter<Sc511Raw, CameraFeed> {
  state: string
}

let listCache: { at: number; features: Sc511Feature[] } | null = null

export const southCarolinaCameras: Sc511Adapter = {
  id: 'sc-cameras',
  state: 'SC',
  refreshMs: 60_000,
  async fetch(aoi: Bbox, signal?: AbortSignal) {
    let features = listCache && Date.now() - listCache.at < LIST_CACHE_MS ? listCache.features : null
    if (!features) {
      const res = await fetch(LIST_PATH, { signal, headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`511SC cameras ${res.status}`)
      const json = (await res.json()) as Sc511Collection
      features = json.features
      listCache = { at: Date.now(), features }
    }
    return { bbox: aoi, features }
  },
  normalize(raw) {
    const { bbox } = raw
    const cameras: CameraFeed[] = []
    for (const f of raw.features) {
      const p = f.properties
      // Inactive cameras have no live snapshot worth showing.
      if (!p.active || f.geometry.type !== 'Point' || f.geometry.coordinates.length < 2) continue
      const [lng, lat] = f.geometry.coordinates
      if (lng < bbox.west || lng > bbox.east || lat < bbox.south || lat > bbox.north) continue
      cameras.push({
        id: `sc511:${p.id}`,
        title: p.description?.trim() || [p.route, p.direction].filter(Boolean).join(' ') || p.name,
        location: [lng, lat],
        snapshotUrl: p.image_url,
        streamUrl: null,
        state: 'SC',
      })
    }
    return cameras
  },
}
