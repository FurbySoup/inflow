import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'
import { stateAt } from '../../lib/states'

// WSDOT ArcGIS camera layer (Washington). Keyless and CORS-open (ACAO echoes the origin), so the browser calls it
// directly and there is no proxy (ADR-0005). One query returns every point (maxRecordCount 2000), so the list is
// fetched once per 12 h and filtered in normalize. OBJECTID must be in outFields: without it the properties are
// just CameraTitle and ImageURL, and no stable id exists (checked by curl 2026-10-11).
const QUERY_URL =
  'https://data.wsdot.wa.gov/arcgis/rest/services/TravelInformation/TravelInfoCamerasWeather/FeatureServer/0/query' +
  '?where=1%3D1&outFields=OBJECTID,CameraTitle,ImageURL&outSR=4326&f=geojson'
const WALK_TTL_MS = 12 * 60 * 60_000
const FETCH_TIMEOUT_MS = 30_000

export interface WsdotFeature {
  geometry: { type: string; coordinates: number[] } | null
  properties: { OBJECTID?: number; CameraTitle?: string | null; ImageURL?: string | null }
}

// fetch hands normalize the cached list plus the AOI it was asked for, so normalize stays a pure function of raw.
export interface WsdotRaw {
  aoi: Bbox
  features: WsdotFeature[]
}

function inBbox(lng: number, lat: number, b: Bbox): boolean {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
}

async function loadList(): Promise<WsdotFeature[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error('WSDOT camera list timed out')), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(QUERY_URL, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`WSDOT camera list ${res.status}`)
    const json = (await res.json()) as { features?: unknown }
    if (!Array.isArray(json.features)) throw new Error('WSDOT camera list: unexpected response')
    return json.features as WsdotFeature[]
  } finally {
    clearTimeout(timer)
  }
}

// Resolves with the shared list, but lets this caller give up on its own signal without discarding the load.
function untilAborted<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

// Module scope: the list is shared by every panel refresh for 12 h. A failed load is not kept, so the next refresh retries.
let cache: { at: number; list: Promise<WsdotFeature[]> } | null = null

export const washingtonCameras: SourceAdapter<WsdotRaw, CameraFeed> = {
  id: 'wsdot-cameras',
  refreshMs: 60_000,
  async fetch(aoi: Bbox, signal?: AbortSignal): Promise<WsdotRaw> {
    if (!cache || Date.now() - cache.at > WALK_TTL_MS) {
      const list = loadList()
      const entry = { at: Date.now(), list }
      cache = entry
      list.catch(() => {
        if (cache === entry) cache = null
      })
    }
    return { aoi, features: await untilAborted(cache.list, signal) }
  },
  normalize(raw) {
    const cameras: CameraFeed[] = []
    for (const f of raw.features) {
      const id = f.properties?.OBJECTID
      const url = f.properties?.ImageURL
      const c = f.geometry?.type === 'Point' ? f.geometry.coordinates : undefined
      // Mixed content: an http:// or missing image cannot be shown on the https app, so the camera is dropped.
      if (id === undefined || !c || c.length < 2 || typeof url !== 'string' || !url.startsWith('https://')) continue
      const lng = c[0]
      const lat = c[1]
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || !inBbox(lng, lat, raw.aoi)) continue
      cameras.push({
        id: `wsdot:${id}`,
        title: f.properties.CameraTitle || `WSDOT camera ${id}`,
        location: [lng, lat],
        snapshotUrl: url,
        streamUrl: null,
        // Oregon cameras on the TripCheck feed sit in this layer too, so tag by place, not by source.
        state: stateAt(lng, lat) ?? 'WA',
      })
    }
    return cameras
  },
}
