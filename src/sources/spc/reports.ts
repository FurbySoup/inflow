import type { StormReport, StormReportKind } from '../../types'
import type { SourceAdapter } from '../types'

export const SPC_REPORTS_URL = 'https://www.spc.noaa.gov/climo/reports/today.csv'

// Section header 2nd column -> report kind. Each section starts with its own header line.
const KIND_BY_COLUMN: Record<string, StormReportKind> = {
  F_Scale: 'tornado',
  Speed: 'wind',
  Size: 'hail',
}

/**
 * SPC day runs 12Z to 12Z. Report times are HHMM UTC: 12xx-23xx fall on the anchor date,
 * 00xx-11xx fall on the following calendar day.
 */
function spcDayAnchor(now: Date): { year: number; month: number; day: number } {
  const d = new Date(now.getTime() - 12 * 3_600_000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

function hhmmToIso(hhmm: string, now: Date): string | null {
  if (!/^\d{4}$/.test(hhmm)) return null
  const hh = Number(hhmm.slice(0, 2))
  const mm = Number(hhmm.slice(2))
  const { year, month, day } = spcDayAnchor(now)
  const dayOffset = hh >= 12 ? 0 : 1
  return new Date(Date.UTC(year, month, day + dayOffset, hh, mm)).toISOString()
}

// Number('') is 0, so blank coordinates must be rejected before conversion.
function parseCoord(s: string): number {
  return s.trim() === '' ? NaN : Number(s)
}

export function parseReportsCsv(raw: string, now: Date = new Date()): StormReport[] {
  const reports: StormReport[] = []
  let kind: StormReportKind | null = null
  let index = 0

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    if (line.startsWith('Time,')) {
      kind = KIND_BY_COLUMN[line.split(',')[1]] ?? null
      continue
    }
    if (!kind) continue

    // Comments may contain commas: take the fixed columns positionally, keep the rest as comments.
    const cols = line.split(',')
    if (cols.length < 7) continue
    const [time, magnitude, , , , lat, lon] = cols
    const iso = hhmmToIso(time, now)
    const location: [number, number] = [parseCoord(lon), parseCoord(lat)]
    if (!iso || !Number.isFinite(location[0]) || !Number.isFinite(location[1])) continue

    reports.push({
      id: `${kind}-${time}-${lat}-${lon}-${index++}`,
      kind,
      time: iso,
      location,
      magnitude: magnitude.trim() || null,
      comments: cols.slice(7).join(',').trim(),
    })
  }
  return reports
}

export interface SpcReportsRaw {
  csv: string
  /** When the CSV was fetched; the SPC day anchor is derived from this, keeping normalize pure. */
  fetchedAt: string
}

export const stormReports: SourceAdapter<SpcReportsRaw, StormReport> = {
  id: 'spc-reports',
  refreshMs: 300_000,
  async fetch(_aoi, signal) {
    const res = await fetch(SPC_REPORTS_URL, { signal })
    if (!res.ok) throw new Error(`SPC reports ${res.status}`)
    return { csv: await res.text(), fetchedAt: new Date().toISOString() }
  },
  normalize(raw) {
    return parseReportsCsv(raw.csv, new Date(raw.fetchedAt))
  },
}
