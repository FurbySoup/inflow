import type { SourceAdapter } from '../types'

// Fetched directly from the browser: Cloudflare challenges server-side requests (ADR-0005).
const BASE = 'https://api.openmhz.com'

interface RawCall {
  url: string
  talkgroupNum?: number
  time: string
  freq?: number
}

export type OpenMhzCallsResponse = { calls?: RawCall[] } | RawCall[]

export interface ScannerCall {
  id: string
  /** Direct mp3 URL for one recorded call. */
  url: string
  talkgroup: number | null
  /** ISO timestamp. */
  time: string
}

export function normalizeCalls(raw: OpenMhzCallsResponse): ScannerCall[] {
  const list = Array.isArray(raw) ? raw : (raw.calls ?? [])
  return list
    .flatMap((c): ScannerCall[] => {
      const t = Date.parse(c.time)
      if (!c.url.startsWith('https://') || Number.isNaN(t)) return []
      return [
        {
          id: c.url,
          url: c.url,
          talkgroup: typeof c.talkgroupNum === 'number' ? c.talkgroupNum : null,
          time: new Date(t).toISOString(),
        },
      ]
    })
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
}

/** Recorded calls for one OpenMHz system, newest first. Polled every 30 s. */
export function openmhzCalls(shortName: string): SourceAdapter<OpenMhzCallsResponse, ScannerCall> {
  return {
    id: `openmhz-calls-${shortName}`,
    refreshMs: 30_000,
    async fetch(_aoi, signal) {
      const res = await fetch(`${BASE}/${encodeURIComponent(shortName)}/calls`, { signal })
      if (!res.ok) throw new Error(`OpenMHz ${shortName} ${res.status}`)
      return res.json()
    },
    normalize: normalizeCalls,
  }
}
