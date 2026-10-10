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

/** Network call for one proxied snapshot, returned as an <img>-ready data URL. */
export async function fetchSnapshotDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`TxDOT snapshot ${res.status}`)
  return snapshotDataUrl((await res.json()) as TxdotSnapshot)
}
