import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'

// IBI/Arcadis "511" platform (511GA, FL511). One factory serves both states.
// Keyless DataTables list: GET /List/GetData/Cameras, page size capped at 100. No CORS, so the list goes through
// the same-origin proxy (ADR-0005). Snapshots are CORS-open PNG/JPEG on the upstream host, so they are plain <img> URLs.
// Checked by curl 2026-10-11: no server-side geo or bbox filter was used, because the full list is walked once per
// 12 h and filtered in normalize. Disabled and blocked images were absent from both full lists at that time.
const PAGE = 100
const CONCURRENCY = 4
const WALK_TTL_MS = 12 * 60 * 60_000
const PAGE_TIMEOUT_MS = 30_000

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

export interface Ibi511Adapter extends SourceAdapter<Ibi511Raw, CameraFeed> {
  /** Two-letter state this site covers; the panel only queries it while the AOI includes that state. */
  state: string
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

export function ibi511Adapter({
  id,
  state,
  proxy,
  host,
  idPrefix,
}: {
  id: string
  state: string
  /** Same-origin proxy path, e.g. /api/511ga. */
  proxy: string
  /** Upstream origin used for absolute snapshot URLs, e.g. https://511ga.org. */
  host: string
  /** Prefix for CameraFeed ids, e.g. 511ga: */
  idPrefix: string
}): Ibi511Adapter {
  // Module-scope per adapter instance: the walked list is shared by every panel refresh for 12 h.
  let cache: { at: number; walk: Promise<Ibi511Record[]> } | null = null

  return {
    id,
    state,
    refreshMs: 60_000,
    async fetch(aoi: Bbox, signal?: AbortSignal): Promise<Ibi511Raw> {
      if (!cache || Date.now() - cache.at > WALK_TTL_MS) {
        const walk = walkList(proxy)
        const entry = { at: Date.now(), walk }
        cache = entry
        // A failed walk is not kept, so the next refresh tries again.
        walk.catch(() => {
          if (cache === entry) cache = null
        })
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
          state,
        })
      }
      return cameras
    },
  }
}

export const georgiaCameras = ibi511Adapter({
  id: 'ga511-cameras',
  state: 'GA',
  proxy: '/api/511ga',
  host: 'https://511ga.org',
  idPrefix: '511ga:',
})

export const floridaCameras = ibi511Adapter({
  id: 'fl511-cameras',
  state: 'FL',
  proxy: '/api/fl511',
  host: 'https://fl511.com',
  idPrefix: 'fl511:',
})
