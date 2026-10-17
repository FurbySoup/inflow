import type { Alert } from '../types'
import { HAZARD } from '../map/mapStyle'
import { hazardCode } from '../lib/hazards'
import { remainingMs } from './alertGeometry'
import { alertInAoi, type AoiMatchTarget } from './aoiMatch'

export const BASE_TITLE = 'INFLOW'

export interface WarningCounts {
  tor: number
  svr: number
}

/** The badge drawn on the favicon: the most severe active warning type in the AOI, or none. */
export type WarningLevel = 'tor' | 'svr' | null

/** Active warnings of one hazard code that intersect the AOI, expired ones dropped (as threatSummary does for TOR). */
export function countInAoi(alerts: Alert[], aoi: AoiMatchTarget, now: number, code: 'TOR' | 'SVR'): number {
  return alerts.filter((a) => {
    if (hazardCode(a.event) !== code) return false
    if (!alertInAoi(a, aoi)) return false
    const left = remainingMs(a.expires, now)
    return left === null || left > 0
  }).length
}

/** Browser tab title. Only ever states counts; with no warnings it is the plain brand, never a "clear" message. */
export function titleFor({ tor, svr }: WarningCounts): string {
  if (tor > 0 && svr > 0) return `(${tor} TOR · ${svr} SVR) ${BASE_TITLE}`
  if (tor > 0) return `(${tor} TOR) ${BASE_TITLE}`
  if (svr > 0) return `(${svr} SVR) ${BASE_TITLE}`
  return BASE_TITLE
}

export function levelFor({ tor, svr }: WarningCounts): WarningLevel {
  if (tor > 0) return 'tor'
  if (svr > 0) return 'svr'
  return null
}

/** The favicon SVG with a hazard-coloured dot added bottom-right. Null level returns the text unchanged. */
export function badgedFavicon(svgText: string, level: WarningLevel): string {
  if (level === null) return svgText
  const fill = level === 'tor' ? HAZARD.TOR : HAZARD.SVR
  const dot = `<circle cx="12.5" cy="12.5" r="3.5" fill="${fill}"/>`
  const end = svgText.lastIndexOf('</svg>')
  if (end === -1) return svgText
  return svgText.slice(0, end) + dot + svgText.slice(end)
}
