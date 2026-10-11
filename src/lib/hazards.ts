import type { Alert } from '../types'

/**
 * Hazard classification shared by the alert rows, top-bar threat button, toasts and map (INFLOW v1 §6).
 * Codes follow the NWS hazards-map legend; anything else is OTHER (still listed, never toasted).
 */
export type HazardCode = 'TOR' | 'SVR' | 'FFW' | 'TOA' | 'SVA' | 'SPS' | 'OTHER'

const BY_EVENT: Record<string, HazardCode> = {
  'Tornado Warning': 'TOR',
  'Severe Thunderstorm Warning': 'SVR',
  'Flash Flood Warning': 'FFW',
  'Tornado Watch': 'TOA',
  'Severe Thunderstorm Watch': 'SVA',
  'Special Weather Statement': 'SPS',
}

export function hazardCode(event: string): HazardCode {
  return BY_EVENT[event] ?? 'OTHER'
}

/** Watches render with a dashed hazard border; warnings with a solid fill. */
export const isWatch = (event: string) => / Watch$/.test(event)

/** Tornado or Flash Flood Emergency (NWS CATASTROPHIC damage threat). */
export const isEmergency = (a: Pick<Alert, 'damageThreat'>) => a.damageThreat === 'catastrophic'

/** PDS treatment: explicit PDS text, any emergency, or a CONSIDERABLE tornado damage threat on a TOR. */
export function isPds(a: Pick<Alert, 'event' | 'pds' | 'damageThreat'>): boolean {
  if (a.pds || isEmergency(a)) return true
  return hazardCode(a.event) === 'TOR' && a.damageThreat === 'considerable'
}

const ORDER: HazardCode[] = ['TOR', 'SVR', 'FFW', 'TOA', 'SVA', 'SPS', 'OTHER']

/** Sort key per the design spec: PDS → TOR → SVR → FFW → TOA → SVA → SPS → other, then soonest expiry. */
export function compareAlerts(a: Alert, b: Alert): number {
  const pds = Number(isPds(b)) - Number(isPds(a))
  if (pds !== 0) return pds
  const rank = ORDER.indexOf(hazardCode(a.event)) - ORDER.indexOf(hazardCode(b.event))
  if (rank !== 0) return rank
  const ea = a.expires ? Date.parse(a.expires) : Infinity
  const eb = b.expires ? Date.parse(b.expires) : Infinity
  return ea - eb
}

/** The alert the threat button and default focus point at: most severe TOR (PDS first), soonest expiry. Null when there is none. */
export function mostSevereTornado(alerts: Alert[]): Alert | null {
  return [...alerts].filter((a) => hazardCode(a.event) === 'TOR').sort(compareAlerts)[0] ?? null
}
