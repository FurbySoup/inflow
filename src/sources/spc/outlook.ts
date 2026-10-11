import type { SourceAdapter } from '../types'

export type OutlookDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** Raw SPC validity window, `YYYYMMDDHHMM` UTC, from the first feature's properties. */
export interface OutlookWindow {
  valid: string
  expire: string
}

/** Day 1–3 categorical outlook, or the Day 4–8 probabilistic outlook. Both are static GeoJSON with CORS `*`. */
export function outlookUrl(day: OutlookDay): string {
  if (day <= 3) return `https://www.spc.noaa.gov/products/outlook/day${day}otlk_cat.nolyr.geojson`
  return `https://www.spc.noaa.gov/products/exper/day4-8/day${day}prob.nolyr.geojson`
}

export const SPC_OUTLOOK_URL = outlookUrl(1)

// An empty day is one feature with an empty GeometryCollection (DN 0), not an empty FeatureCollection.
function isEmptyFeature(f: GeoJSON.Feature): boolean {
  if (!f.geometry) return true
  if (f.geometry.type === 'GeometryCollection') return f.geometry.geometries.length === 0
  return f.properties?.DN === 0
}

/** LABEL of an empty placeholder, e.g. `Predictability Too Low`, or null when the raw day has polygons. */
export function emptyDayLabel(raw: GeoJSON.FeatureCollection): string | null {
  const label = raw.features.find(isEmptyFeature)?.properties?.LABEL
  return typeof label === 'string' && label !== '' ? label : null
}

const adapters = new Map<OutlookDay, SourceAdapter<GeoJSON.FeatureCollection, GeoJSON.Feature>>()

function refreshMsFor(day: OutlookDay): number {
  return day <= 3 ? 120_000 : 30 * 60_000
}

// OutlookRisk keys its query on the bbox, so every pan would refetch the same file. One request per day is shared
// for a refresh window. A failed request is dropped so the next call tries again.
interface Memo {
  at: number
  load: Promise<GeoJSON.FeatureCollection>
}
const memos = new Map<OutlookDay, Memo>()

async function fetchDay(day: OutlookDay): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(outlookUrl(day))
  if (!res.ok) throw new Error(`SPC outlook D${day} ${res.status}`)
  return res.json()
}

function memoizedDay(day: OutlookDay): Promise<GeoJSON.FeatureCollection> {
  const hit = memos.get(day)
  if (hit && Date.now() - hit.at < refreshMsFor(day)) return hit.load
  const entry: Memo = { at: Date.now(), load: fetchDay(day) }
  memos.set(day, entry)
  entry.load.catch(() => {
    if (memos.get(day) === entry) memos.delete(day)
  })
  return entry.load
}

// The shared request ignores each caller's signal, so one aborted caller cannot fail the others.
function untilAborted<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/** One memoized adapter per outlook day. Days 1–3 refresh every 2 min; Days 4–8 every 30 min (SPC reissues them rarely). */
export function spcOutlookDay(day: OutlookDay): SourceAdapter<GeoJSON.FeatureCollection, GeoJSON.Feature> {
  const existing = adapters.get(day)
  if (existing) return existing
  const adapter: SourceAdapter<GeoJSON.FeatureCollection, GeoJSON.Feature> = {
    id: `spc-outlook-d${day}`,
    refreshMs: refreshMsFor(day),
    fetch(_aoi, signal) {
      return untilAborted(memoizedDay(day), signal)
    },
    normalize(raw) {
      return raw.features.filter((f) => !isEmptyFeature(f))
    },
  }
  adapters.set(day, adapter)
  return adapter
}

/** Validity window of the first feature, or null when the day has no VALID stamp. Pass raw features, not normalized ones. */
export function outlookWindow(features: GeoJSON.Feature[]): OutlookWindow | null {
  const p = features[0]?.properties
  if (typeof p?.VALID !== 'string' || typeof p.EXPIRE !== 'string') return null
  return { valid: p.VALID, expire: p.EXPIRE }
}

/** Day 1 adapter, kept for existing imports. */
export const spcOutlook = spcOutlookDay(1)
