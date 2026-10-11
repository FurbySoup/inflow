import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'

// KanDrive (KS) and Nebraska 511 (NE) share the CARS GraphQL backend. Query text and variable shape
// copied from the KanDrive map bundle and verified against both sites on 2026-10-10. CORS is `*`, no key.
const MAP_FEATURES_QUERY =
  'query MapFeatures($input: MapFeaturesArgs!, $plowType: String) { mapFeaturesQuery(input: $input) { mapFeatures { bbox title tooltip uri features { id geometry properties type } ... on Cluster { maxZoom } ... on Sign { signDisplayType } ... on Event { priority } __typename ... on Camera { active views(limit: 5) { uri ... on CameraView { url } category } } ... on Plow { views(limit: 5, plowType: $plowType) { uri ... on PlowCameraView { url } category } } } error { message type } } }'

// At zoom 6 over Wichita the server returned one cluster ("Show 102 cameras") instead of cameras.
// Zoom at which results stop being clusters differs per CARS state (checked 2026-10-11), so it is a per-adapter option.
const DEFAULT_ZOOM = 9

interface CarsView {
  uri: string
  url: string | null
  category: string
}

interface CarsMapFeature {
  uri: string
  title: string
  __typename: string
  active?: boolean
  features: { id: string; geometry: { type: string; coordinates: number[] } }[]
  views?: CarsView[]
}

export interface CarsResponse {
  data?: { mapFeaturesQuery: { mapFeatures: CarsMapFeature[] } | null } | null
  errors?: { message: string }[]
}

export interface CarsAdapter extends SourceAdapter<CarsResponse, CameraFeed> {
  /** Two-letter state this endpoint covers; the panel only queries it while the AOI includes that state. */
  state: string
}

export function carsAdapter({
  id,
  state,
  endpoint,
  zoom = DEFAULT_ZOOM,
}: {
  id: string
  state: string
  endpoint: string
  zoom?: number
}): CarsAdapter {
  return {
    id,
    state,
    refreshMs: 5 * 60_000,
    async fetch(aoi: Bbox, signal?: AbortSignal) {
      const body = {
        query: MAP_FEATURES_QUERY,
        variables: {
          input: {
            north: aoi.north,
            south: aoi.south,
            east: aoi.east,
            west: aoi.west,
            zoom,
            layerSlugs: ['normalCameras'],
            nonClusterableUris: ['dashboard'],
          },
          plowType: 'plowCameras',
        },
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`${state} cameras ${res.status}`)
      const json = (await res.json()) as CarsResponse
      if (json.errors?.length) throw new Error(`${state} cameras: ${json.errors[0].message}`)
      return json
    },
    normalize(raw) {
      const features = raw.data?.mapFeaturesQuery?.mapFeatures ?? []
      const cameras: CameraFeed[] = []
      for (const f of features) {
        // Clusters and other map features share the response; keep only individual cameras.
        if (f.__typename !== 'Camera' || f.active === false) continue
        // Roughly 44 KS views have url: null. Use the first view that has a snapshot.
        const snapshotUrl = f.views?.map((v) => v.url).find((u): u is string => !!u)
        const point = f.features.find((g) => g.geometry.type === 'Point')
        if (!snapshotUrl || !point || point.geometry.coordinates.length < 2) continue
        const [lng, lat] = point.geometry.coordinates
        cameras.push({
          id: f.uri,
          title: f.title,
          location: [lng, lat],
          snapshotUrl,
          streamUrl: null,
          state,
        })
      }
      return cameras
    },
  }
}

// Same-origin proxy routes (vite.config.ts). Direct calls to the upstreams fail the browser CORS preflight
// for application/json POSTs from a localhost origin (verified 2026-10-10), so the proxy is required.
export const kansasCameras = carsAdapter({
  id: 'ks-cameras',
  state: 'KS',
  endpoint: '/api/kandrive/graphql',
})

export const nebraskaCameras = carsAdapter({
  id: 'ne-cameras',
  state: 'NE',
  endpoint: '/api/ne511/graphql',
})

// Zoom is the level where the server stops returning clusters (checked 2026-10-11): IA z9 is mostly clusters,
// z10 17 cameras + 8 clusters, z11 is all cameras.
export const iowaCameras = carsAdapter({
  id: 'ia-cameras',
  state: 'IA',
  endpoint: '/api/511ia/graphql',
  zoom: 11,
})

// MN z9 is already all cameras (Minneapolis: 196 cameras, 0 clusters).
export const minnesotaCameras = carsAdapter({
  id: 'mn-cameras',
  state: 'MN',
  endpoint: '/api/511mn/graphql',
  zoom: 9,
})

// IN z9 clusters; z10 32 + 6, z11 68 + 4, z12 79 + 2; z13 is all cameras (0 clusters).
export const indianaCameras = carsAdapter({
  id: 'in-cameras',
  state: 'IN',
  endpoint: '/api/511in/graphql',
  zoom: 13,
})
