// Snapshot endpoint returns JSON { icd_Id, snippet }, where snippet is a bare base64 JPEG (no data: prefix).

export interface TxdotSnapshot {
  icd_Id?: string
  snippet?: string
}

export function snapshotDataUrl(json: TxdotSnapshot): string {
  if (typeof json.snippet !== 'string' || json.snippet.length === 0) {
    throw new Error('TxDOT snapshot has no image')
  }
  return `data:image/jpeg;base64,${json.snippet}`
}

// Concurrent requests for the same URL share one network call (e.g. a tile and the expanded view).
// The entry is dropped once the request settles, so later refresh ticks fetch again. The shared request
// is not tied to any one caller's AbortSignal, so one caller unmounting cannot fail the others; callers
// ignore results they no longer need.
const inFlight = new Map<string, Promise<string>>()

async function requestSnapshot(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TxDOT snapshot ${res.status}`)
  return snapshotDataUrl((await res.json()) as TxdotSnapshot)
}

/** Network call for one proxied snapshot, returned as an <img>-ready data URL. */
export function fetchSnapshotDataUrl(url: string): Promise<string> {
  const pending = inFlight.get(url)
  if (pending) return pending
  const request = requestSnapshot(url).finally(() => {
    inFlight.delete(url)
  })
  inFlight.set(url, request)
  return request
}
