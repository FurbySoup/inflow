import type { Bbox, CameraFeed } from '../../types'
import { stateAt } from '../../lib/states'
import type { SourceAdapter } from '../types'

// IBI/Arcadis "511" platform (511GA, FL511, AZ511, 511 Idaho, 511 Alaska, 511LA, CTroads, NV Roads, 511PA, New England 511).
// One factory serves every site. Keyless DataTables list: GET /List/GetData/Cameras, page size capped at 100. No CORS,
// so the list goes through the same-origin proxy (ADR-0005). Snapshots are CORS-open images on the upstream host, so
// they are plain <img> URLs (never fetch() or crossOrigin on them).
// Checked by curl 2026-10-11: no server-side geo or bbox filter was used, because the full list is walked once per
// 12 h and filtered in normalize. Disabled and blocked images were absent from both full lists at that time.
const PAGE = 100
const CONCURRENCY = 4
const WALK_TTL_MS = 12 * 60 * 60_000
const PAGE_TIMEOUT_MS = 30_000
// After a failed walk the next one waits 1, 2, 4, 8, 16, then 30 min (capped). Until then fetch rejects with the last error.
const BACKOFF_BASE_MS = 60_000
const BACKOFF_CAP_MS = 30 * 60_000

export interface Ibi511Image {
  id: number
  imageUrl: string
  disabled: boolean
  blocked: boolean
}

export interface Ibi511Record {
  id: number
  location: string
  latLng: { geography: { wellKnownText: string } }
  images: Ibi511Image[]
}

export interface Ibi511ListResponse {
  recordsTotal: number
  data: Ibi511Record[]
}

// fetch hands normalize the cached full list plus the AOI it was asked for, so normalize stays a pure function of raw.
export interface Ibi511Raw {
  aoi: Bbox
  records: Ibi511Record[]
}

export interface Ibi511Site {
  /** Unique adapter id, e.g. ga511-cameras. */
  id: string
  /** Two-letter states this site covers; the panel only queries it while the AOI includes one of them. */
  states: string[]
  /** Same-origin proxy path, e.g. /api/511ga. */
  proxy: string
  /** Upstream origin used for absolute snapshot URLs, e.g. https://511ga.org. */
  host: string
  /** Prefix for CameraFeed ids, e.g. 511ga: */
  idPrefix: string
  /** Picks a camera's state when the site covers several. Defaults to the site's first state. */
  stateFor?: (lng: number, lat: number) => string
}

const POINT = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i

/** Parses a WKT point ("POINT (lng lat)") into [lng, lat]; anything else (or 0,0) gives null. */
export function parseWkt(wkt: string | undefined): [number, number] | null {
  const m = POINT.exec((wkt ?? '').trim())
  if (!m) return null
  const lng = Number(m[1])
  const lat = Number(m[2])
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || (lng === 0 && lat === 0)) return null
  return [lng, lat]
}

function inBbox(lng: number, lat: number, b: Bbox): boolean {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
}

// A stuck connection must fail the page, not pin the cached walk for the whole TTL.
async function fetchPage(proxy: string, start: number): Promise<Ibi511ListResponse> {
  const query = encodeURIComponent(JSON.stringify({ columns: [], start, length: PAGE }))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error(`511 camera list ${proxy} timed out at ${start}`)), PAGE_TIMEOUT_MS)
  try {
    const res = await fetch(`${proxy}/List/GetData/Cameras?query=${query}&lang=en`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`511 camera list ${proxy} ${res.status}`)
    const json = (await res.json()) as Partial<Ibi511ListResponse>
    if (!Array.isArray(json.data) || typeof json.recordsTotal !== 'number') {
      throw new Error(`511 camera list ${proxy}: unexpected response at ${start}`)
    }
    return json as Ibi511ListResponse
  } finally {
    clearTimeout(timer)
  }
}

// A 200 with a short or empty page must never be cached as a complete walk.
function checkPage(proxy: string, start: number, page: Ibi511ListResponse, total: number) {
  const expected = Math.min(PAGE, Math.max(0, total - start))
  if (page.data.length !== expected) {
    throw new Error(`511 camera list ${proxy}: page at ${start} had ${page.data.length} rows, expected ${expected}`)
  }
}

// Reads page 0 for recordsTotal, then the remaining pages with at most CONCURRENCY in flight.
// After one page fails, no further pages are started.
async function walkList(proxy: string): Promise<Ibi511Record[]> {
  const first = await fetchPage(proxy, 0)
  const total = first.recordsTotal
  checkPage(proxy, 0, first, total)
  const starts: number[] = []
  for (let s = PAGE; s < total; s += PAGE) starts.push(s)
  const pages: Ibi511Record[][] = new Array<Ibi511Record[]>(starts.length)
  let next = 0
  let failed = false
  const worker = async () => {
    while (!failed && next < starts.length) {
      const i = next++
      try {
        const page = await fetchPage(proxy, starts[i])
        checkPage(proxy, starts[i], page, total)
        pages[i] = page.data
      } catch (err) {
        failed = true
        throw err
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, starts.length) }, worker))
  return [...first.data, ...pages.flat()]
}

// Resolves with the shared walk, but lets this caller give up on its own signal. The walk itself is not
// tied to any one caller's signal, so a pan that aborts one query does not throw away a walk in progress.
function untilAborted<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

function backoffMs(failures: number): number {
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (failures - 1))
}

export function ibi511Adapter(site: Ibi511Site): SourceAdapter<Ibi511Raw, CameraFeed> {
  const { id, states, proxy, host, idPrefix } = site
  // Module-scope per adapter instance: the walked list is shared by every panel refresh for 12 h.
  let cache: { at: number; walk: Promise<Ibi511Record[]> } | null = null
  let failures = 0
  let retryAt = 0
  let lastError: Error | null = null

  return {
    id,
    refreshMs: 60_000,
    async fetch(aoi: Bbox, signal?: AbortSignal): Promise<Ibi511Raw> {
      if (!cache || Date.now() - cache.at > WALK_TTL_MS) {
        if (lastError && Date.now() < retryAt) throw lastError
        const walk = walkList(proxy)
        const entry = { at: Date.now(), walk }
        cache = entry
        walk.then(
          () => {
            failures = 0
            retryAt = 0
            lastError = null
          },
          (err: unknown) => {
            // A failed walk is not kept, so the next refresh tries again once the back-off has passed.
            if (cache === entry) cache = null
            failures += 1
            lastError = err instanceof Error ? err : new Error(String(err))
            retryAt = Date.now() + backoffMs(failures)
          },
        )
      }
      return { aoi, records: await untilAborted(cache.walk, signal) }
    },
    normalize(raw) {
      const cameras: CameraFeed[] = []
      for (const r of raw.records) {
        // The first image is the one the panel shows. Disabled, blocked or missing images are dropped.
        const img = r.images?.[0]
        if (!img || img.disabled || img.blocked || !img.imageUrl) continue
        const point = parseWkt(r.latLng?.geography?.wellKnownText)
        if (!point || !inBbox(point[0], point[1], raw.aoi)) continue
        cameras.push({
          id: `${idPrefix}${r.id}`,
          title: r.location,
          location: point,
          snapshotUrl: `${host}${img.imageUrl}`,
          streamUrl: null,
          state: site.stateFor ? site.stateFor(point[0], point[1]) : states[0],
        })
      }
      return cameras
    },
  }
}

const georgia: Ibi511Site = {
  id: 'ga511-cameras',
  states: ['GA'],
  proxy: '/api/511ga',
  host: 'https://511ga.org',
  idPrefix: '511ga:',
}

const florida: Ibi511Site = {
  id: 'fl511-cameras',
  states: ['FL'],
  proxy: '/api/fl511',
  host: 'https://fl511.com',
  idPrefix: 'fl511:',
}

const arizona: Ibi511Site = {
  id: 'az511-cameras',
  states: ['AZ'],
  proxy: '/api/az511',
  host: 'https://az511.gov',
  idPrefix: 'az511:',
}

const idaho: Ibi511Site = {
  id: 'id511-cameras',
  states: ['ID'],
  proxy: '/api/511id',
  host: 'https://511.idaho.gov',
  idPrefix: 'id511:',
}

const alaska: Ibi511Site = {
  id: 'ak511-cameras',
  states: ['AK'],
  proxy: '/api/511ak',
  host: 'https://511.alaska.gov',
  idPrefix: 'ak511:',
}

const louisiana: Ibi511Site = {
  id: 'la511-cameras',
  states: ['LA'],
  proxy: '/api/511la',
  host: 'https://511la.org',
  idPrefix: 'la511:',
}

const connecticut: Ibi511Site = {
  id: 'ctroads-cameras',
  states: ['CT'],
  proxy: '/api/ctroads',
  host: 'https://ctroads.org',
  idPrefix: 'ctroads:',
}

const nevada: Ibi511Site = {
  id: 'nvroads-cameras',
  states: ['NV'],
  proxy: '/api/nvroads',
  host: 'https://www.nvroads.com',
  idPrefix: 'nvroads:',
}

const pennsylvania: Ibi511Site = {
  id: 'pa511-cameras',
  states: ['PA'],
  proxy: '/api/511pa',
  host: 'https://www.511pa.com',
  idPrefix: 'pa511:',
}

// VT, NH and ME share one list; each camera is tagged by where it sits. Border points can land in the neighbour (ADR-0016).
const newEngland: Ibi511Site = {
  id: 'newengland511-cameras',
  states: ['VT', 'NH', 'ME'],
  proxy: '/api/newengland511',
  host: 'https://newengland511.org',
  idPrefix: 'newengland511:',
  stateFor: (lng, lat) => stateAt(lng, lat) ?? 'VT',
}

/** Every IBI 511 site the app knows about. The table test checks each one's config. */
export const ibi511Sites: readonly Ibi511Site[] = [
  georgia,
  florida,
  arizona,
  idaho,
  alaska,
  louisiana,
  connecticut,
  nevada,
  pennsylvania,
  newEngland,
]

export const georgiaCameras = ibi511Adapter(georgia)
export const floridaCameras = ibi511Adapter(florida)
export const arizonaCameras = ibi511Adapter(arizona)
export const idahoCameras = ibi511Adapter(idaho)
export const alaskaCameras = ibi511Adapter(alaska)
export const louisianaCameras = ibi511Adapter(louisiana)
export const connecticutCameras = ibi511Adapter(connecticut)
export const nevadaCameras = ibi511Adapter(nevada)
export const pennsylvaniaCameras = ibi511Adapter(pennsylvania)
export const newEnglandCameras = ibi511Adapter(newEngland)
