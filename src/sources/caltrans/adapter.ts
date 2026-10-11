import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'
import { bboxesOverlap } from '../../lib/geo'

// Caltrans CCTV (CWWP2, California). One static JSON file per district, CORS `*`, no key, so the browser fetches
// it directly and there is no proxy (ADR-0005). Every value in the JSON is a string, including the coordinates and
// inService ("true" / "false"). Checked by curl 2026-10-11.
const TTL_MS = 12 * 60 * 60_000
const FETCH_TIMEOUT_MS = 30_000

// Min/max of the in-service camera coordinates in each district file, plus 0.1°, rounded outward to 0.001°.
// Computed 2026-10-11 from the 12 live files (3591 cameras). A fetch only asks for districts whose box overlaps the AOI.
export const DISTRICT_BBOXES: Record<number, Bbox> = {
  1: { west: -124.3, east: -122.504, south: 38.652, north: 42.095 },
  2: { west: -123.092, east: -119.938, south: 39.674, north: 42.097 },
  3: { west: -122.26, east: -119.857, south: 37.977, north: 39.89 },
  4: { west: -122.891, east: -121.412, south: 36.819, north: 38.627 },
  5: { west: -122.124, east: -119.386, south: 34.285, north: 37.231 },
  6: { west: -120.824, east: -118.707, south: 34.717, north: 37.432 },
  7: { west: -119.395, east: -117.594, south: 33.646, north: 34.895 },
  8: { west: -117.844, east: -114.45, south: 33.338, north: 35.702 },
  9: { west: -119.551, east: -117.769, south: 34.887, north: 38.451 },
  10: { west: -121.776, east: -119.85, south: 36.877, north: 38.508 },
  11: { west: -117.489, east: -115.398, south: 32.451, north: 33.443 },
  12: { west: -118.192, east: -117.493, south: 33.296, north: 34.043 },
}

const DISTRICTS = Object.keys(DISTRICT_BBOXES).map(Number)

/** District numbers whose camera box overlaps the AOI, ascending. */
export function districtsForBbox(aoi: Bbox): number[] {
  return DISTRICTS.filter((d) => bboxesOverlap(aoi, DISTRICT_BBOXES[d]))
}

export function districtUrl(district: number): string {
  return `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${String(district).padStart(2, '0')}.json`
}

export interface CaltransCctv {
  cctv?: {
    index?: string
    location?: { locationName?: string; longitude?: string; latitude?: string }
    inService?: string
    imageData?: { static?: { currentImageURL?: string } }
  }
}

export interface CaltransRaw {
  aoi: Bbox
  files: { district: number; data: CaltransCctv[] }[]
}

function inBbox(lng: number, lat: number, b: Bbox): boolean {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
}

// The JSON carries coordinates as strings, so an empty or missing value must not become 0 through Number().
function num(s: string | undefined): number {
  return typeof s === 'string' && s.trim() !== '' ? Number(s) : NaN
}

async function loadDistrict(district: number): Promise<CaltransCctv[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error(`Caltrans D${district} timed out`)), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(districtUrl(district), { signal: ctrl.signal })
    if (!res.ok) throw new Error(`Caltrans D${district} ${res.status}`)
    const json = (await res.json()) as { data?: unknown }
    if (!Array.isArray(json.data)) throw new Error(`Caltrans D${district}: unexpected response`)
    return json.data as CaltransCctv[]
  } finally {
    clearTimeout(timer)
  }
}

// Resolves with the shared district load, but lets this caller give up on its own signal without discarding it.
function untilAborted<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

// Module scope, one entry per district, each cached for 12 h. A failed load is dropped so the next refresh retries it.
const cache = new Map<number, { at: number; load: Promise<CaltransCctv[]> }>()

function cachedDistrict(district: number, signal?: AbortSignal): Promise<CaltransCctv[]> {
  let entry = cache.get(district)
  if (!entry || Date.now() - entry.at > TTL_MS) {
    const load = loadDistrict(district)
    entry = { at: Date.now(), load }
    cache.set(district, entry)
    const kept = entry
    load.catch(() => {
      if (cache.get(district) === kept) cache.delete(district)
    })
  }
  return untilAborted(entry.load, signal)
}

export const californiaCameras: SourceAdapter<CaltransRaw, CameraFeed> = {
  id: 'caltrans-cameras',
  refreshMs: 60_000,
  async fetch(aoi: Bbox, signal?: AbortSignal): Promise<CaltransRaw> {
    const wanted = districtsForBbox(aoi)
    const settled = await Promise.allSettled(wanted.map((d) => cachedDistrict(d, signal)))
    const files = settled.flatMap((r, i) => (r.status === 'fulfilled' ? [{ district: wanted[i], data: r.value }] : []))
    // One district failing should not hide the rest; only a total failure is an error.
    if (wanted.length > 0 && files.length === 0) throw new Error('Caltrans camera lists unavailable')
    return { aoi, files }
  },
  normalize(raw) {
    const cameras: CameraFeed[] = []
    for (const { district, data } of raw.files) {
      for (const row of data) {
        const c = row.cctv
        if (!c || c.inService !== 'true' || !c.index) continue
        const url = c.imageData?.static?.currentImageURL
        if (typeof url !== 'string' || !url.startsWith('https://')) continue
        const lng = num(c.location?.longitude)
        const lat = num(c.location?.latitude)
        if (!Number.isFinite(lng) || !Number.isFinite(lat) || (lng === 0 && lat === 0)) continue
        if (!inBbox(lng, lat, raw.aoi)) continue
        cameras.push({
          id: `caltrans:${district}-${c.index}`,
          title: c.location?.locationName || `Caltrans D${district} camera ${c.index}`,
          location: [lng, lat],
          snapshotUrl: url,
          streamUrl: null,
          state: 'CA',
        })
      }
    }
    return cameras
  },
}
