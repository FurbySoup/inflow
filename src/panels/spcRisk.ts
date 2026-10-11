import { bboxIntersectsGeometry } from '../lib/geo'
import type { Bbox } from '../types'

/** SPC categorical risk, lowest to highest. */
export const RISK_ORDER = ['TSTM', 'MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH'] as const
export type RiskCategory = (typeof RISK_ORDER)[number]

const rankOf = (label: unknown): number => (typeof label === 'string' ? RISK_ORDER.indexOf(label as RiskCategory) : -1)

/** Highest categorical LABEL whose polygon shares area with the bbox, or null when none does. */
export function highestCategory(features: GeoJSON.Feature[], bbox: Bbox): RiskCategory | null {
  let best = -1
  for (const f of features) {
    const rank = rankOf(f.properties?.LABEL)
    if (rank <= best) continue
    if (bboxIntersectsGeometry(bbox, f.geometry)) best = rank
  }
  return best < 0 ? null : RISK_ORDER[best]
}

/** Highest categorical LABEL over the whole outlook, ignoring the AOI, or null when no feature carries one. */
export function highestLabel(features: GeoJSON.Feature[]): RiskCategory | null {
  let best = -1
  for (const f of features) best = Math.max(best, rankOf(f.properties?.LABEL))
  return best < 0 ? null : RISK_ORDER[best]
}

export interface RiskDay {
  day: 1 | 2 | 3
  label: RiskCategory | null
}

/**
 * Day 1 always, then Day 2 or Day 3 only when it is higher than every earlier day, so the bar shows
 * the next step up in risk and nothing that repeats it.
 */
export function riskSummary(d1: RiskCategory | null, d2: RiskCategory | null, d3: RiskCategory | null): RiskDay[] {
  const out: RiskDay[] = [{ day: 1, label: d1 }]
  let top = rankOf(d1)
  for (const [day, label] of [
    [2, d2],
    [3, d3],
  ] as const) {
    const rank = rankOf(label)
    if (rank > top) {
      out.push({ day, label })
      top = rank
    }
  }
  return out
}
