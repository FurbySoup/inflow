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
  }
}

export interface NwsAlertsResponse {
  features: NwsFeature[]
}

const SEVERITIES: AlertSeverity[] = ['Extreme', 'Severe', 'Moderate', 'Minor']

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
      }
    })
  },
}
