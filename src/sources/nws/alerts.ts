import type { Alert, AlertSeverity } from '../../types'
import type { SourceAdapter } from '../types'

// NWS asks for an identifying User-Agent; browsers can't set it, so the dev proxy (/api/nws) adds it.
const BASE = '/api/nws'

interface NwsFeature {
  id: string
  geometry: Alert['geometry']
  properties: {
    event: string
    severity: string
    headline: string | null
    areaDesc: string
    onset: string | null
    expires: string | null
    geocode?: { UGC?: string[] }
    affectedZones?: string[]
    description?: string | null
    sent?: string | null
    messageType?: string | null
    parameters?: { tornadoDamageThreat?: string[]; flashFloodDamageThreat?: string[]; VTEC?: string[] }
  }
}

export interface NwsAlertsResponse {
  features: NwsFeature[]
}

const SEVERITIES: AlertSeverity[] = ['Extreme', 'Severe', 'Moderate', 'Minor']

const MESSAGE_TYPES = ['Alert', 'Update', 'Cancel'] as const

/** "/O.CON.KFFC.TO.W.0123.261011T1800Z-261011T1830Z/" → "KFFC.TO.W.0123". First operational VTEC string wins. */
export function vtecEventKey(vtec: string[] | undefined): string | null {
  for (const v of vtec ?? []) {
    const m = /^\/O\.[A-Z]{3}\.([A-Z]{4})\.([A-Z]{2})\.([A-Z])\.(\d{4})\./.exec(v)
    if (m) return `${m[1]}.${m[2]}.${m[3]}.${m[4]}`
  }
  return null
}

/** Highest impact-based damage tag across the tornado and flash-flood threat parameters. */
function damageThreat(parameters: NwsFeature['properties']['parameters']): Alert['damageThreat'] {
  const tags = [...(parameters?.tornadoDamageThreat ?? []), ...(parameters?.flashFloodDamageThreat ?? [])].map((t) =>
    t.toUpperCase(),
  )
  if (tags.includes('CATASTROPHIC')) return 'catastrophic'
  if (tags.includes('CONSIDERABLE')) return 'considerable'
  return null
}

export const nwsAlerts: SourceAdapter<NwsAlertsResponse, Alert> = {
  id: 'nws-alerts',
  refreshMs: 60_000,
  async fetch(_aoi, signal) {
    const res = await fetch(`${BASE}/alerts/active?status=actual`, {
      signal,
      headers: { Accept: 'application/geo+json' },
    })
    if (!res.ok) throw new Error(`NWS alerts ${res.status}`)
    return res.json()
  },
  normalize(raw) {
    return raw.features.map((f) => {
      const p = f.properties
      const ugc = p.geocode?.UGC ?? []
      return {
        id: f.id,
        event: p.event,
        severity: (SEVERITIES as string[]).includes(p.severity)
          ? (p.severity as AlertSeverity)
          : 'Unknown',
        headline: p.headline ?? p.event,
        areaDesc: p.areaDesc,
        onset: p.onset,
        expires: p.expires,
        geometry: f.geometry,
        states: [...new Set(ugc.map((z) => z.slice(0, 2)))],
        zones: p.affectedZones ?? [],
        damageThreat: damageThreat(p.parameters),
        pds: /PARTICULARLY DANGEROUS SITUATION/i.test(`${p.headline ?? ''} ${p.description ?? ''}`),
        sent: p.sent ?? null,
        messageType: MESSAGE_TYPES.includes(p.messageType as never) ? (p.messageType as Alert['messageType']) : null,
        eventKey: vtecEventKey(p.parameters?.VTEC) ?? f.id,
      }
    })
  },
}
