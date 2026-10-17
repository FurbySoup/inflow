import type { SourceAdapter } from '../types'

// Fetched directly from the browser: Cloudflare challenges server-side requests (ADR-0005).
const LIST_URL = 'https://api.openmhz.com/systems'
const LIST_TTL_MS = 12 * 60 * 60_000
const ACTIVE_WINDOW_MS = 24 * 60 * 60_000

export interface OpenMhzSystem {
  shortName: string
  name: string
  systemType?: string
  // Absent in the live list for systems that are not city/county based (e.g. international).
  city?: string | null
  county?: string | null
  // Absent in the live list for 13 non-US systems, so it can be missing as well as null.
  state?: string | null
  active: boolean
  /** ISO timestamp. */
  lastActive: string
}

export interface OpenMhzSystemsResponse {
  success: boolean
  systems: OpenMhzSystem[]
}

// The cached full list, stamped with when it was fetched so normalize can judge recency without reading the clock.
export interface OpenMhzSystemsRaw {
  fetchedAt: number
  systems: OpenMhzSystem[]
}

export interface ScannerSystem {
  shortName: string
  name: string
  state: string
  /** City, else county, else ''. */
  place: string
  /** ISO timestamp. */
  lastActive: string
}

/** Keeps US systems (two-letter state) heard within 24 h of the fetch, sorted by state then name. */
export function normalizeSystems(raw: OpenMhzSystemsRaw): ScannerSystem[] {
  const cutoff = raw.fetchedAt - ACTIVE_WINDOW_MS
  return raw.systems
    .flatMap((s): ScannerSystem[] => {
      const t = Date.parse(s.lastActive)
      if (!s.state || !/^[A-Z]{2}$/.test(s.state) || Number.isNaN(t) || t < cutoff) return []
      return [
        {
          shortName: s.shortName,
          name: s.name,
          state: s.state,
          // Trimmed: the live list has a county of "Florence " (trailing space) on fireems.
          place: (s.city ?? '').trim() || (s.county ?? '').trim(),
          lastActive: new Date(t).toISOString(),
        },
      ]
    })
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name))
}

/**
 * Picker label: `name · place (ST)`, or `name (ST)` with no place. OpenMHz reuses names, so when another system in `all`
 * has the same name, the shortName is appended to tell them apart.
 */
export function systemLabel(system: ScannerSystem, all: ScannerSystem[]): string {
  const base = system.place ? `${system.name} · ${system.place} (${system.state})` : `${system.name} (${system.state})`
  const clash = all.some((s) => s.shortName !== system.shortName && s.name === system.name)
  return clash ? `${base} · ${system.shortName}` : base
}

/** Systems whose state is in the AOI, in list order. */
export function systemsInAoi(systems: ScannerSystem[], states: string[]): ScannerSystem[] {
  const inAoi = new Set(states)
  return systems.filter((s) => inAoi.has(s.state))
}

/** Distinct states that have at least one system, sorted. Used for the empty-AOI coverage text. */
export function coveredStates(systems: ScannerSystem[]): string[] {
  return [...new Set(systems.map((s) => s.state))].sort()
}

async function fetchList(): Promise<OpenMhzSystem[]> {
  const res = await fetch(LIST_URL)
  if (!res.ok) throw new Error(`OpenMHz systems ${res.status}`)
  const json = (await res.json()) as Partial<OpenMhzSystemsResponse>
  if (json.success !== true || !Array.isArray(json.systems)) {
    throw new Error('OpenMHz systems: unexpected response')
  }
  return json.systems
}

/**
 * The systems list is about 180 KB and the same for every AOI, so one shared copy is kept for 12 h.
 * Without it, every pan (a new bbox query key) would download it again.
 */
export function openmhzSystemsAdapter(): SourceAdapter<OpenMhzSystemsRaw, ScannerSystem> {
  let cache: { at: number; list: Promise<OpenMhzSystemsRaw> } | null = null

  return {
    id: 'openmhz-systems',
    refreshMs: 30 * 60_000,
    // The shared list is not tied to one caller's signal: an aborted pan must not fail the list for everyone.
    async fetch() {
      if (!cache || Date.now() - cache.at > LIST_TTL_MS) {
        const at = Date.now()
        const list = fetchList().then((systems) => ({ fetchedAt: at, systems }))
        const entry = { at, list }
        cache = entry
        // A failed fetch is not kept, so the next refresh tries again.
        list.catch(() => {
          if (cache === entry) cache = null
        })
      }
      return cache.list
    },
    normalize: normalizeSystems,
  }
}

export const openmhzSystems = openmhzSystemsAdapter()
