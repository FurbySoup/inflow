/**
 * Hazard codes for NWS events (INFLOW v1 §6). Kit-level and dependency-free so kit components can use them;
 * src/lib/hazards.ts re-exports these and adds the Alert-based rules (PDS, sort order).
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
