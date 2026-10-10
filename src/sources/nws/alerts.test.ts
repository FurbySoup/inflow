import { describe, expect, it } from 'vitest'
import { nwsAlerts, type NwsAlertsResponse } from './alerts'

const fixture: NwsAlertsResponse = {
  features: [
    {
      id: 'urn:oid:tor-1',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-81.7, 32.7], [-81.5, 32.7], [-81.5, 32.9], [-81.7, 32.7]]],
      },
      properties: {
        event: 'Tornado Warning',
        severity: 'Extreme',
        headline: 'Tornado Warning issued for Screven County',
        areaDesc: 'Screven, GA',
        onset: '2026-10-10T18:20:00Z',
        expires: '2026-10-10T19:00:00Z',
        geocode: { UGC: ['GAC251'] },
      },
    },
    {
      id: 'urn:oid:watch-1',
      geometry: null,
      properties: {
        event: 'Tornado Watch',
        severity: 'Bogus',
        headline: null,
        areaDesc: 'Burke, GA; Bamberg, SC',
        onset: null,
        expires: null,
        geocode: { UGC: ['GAC033', 'SCC009', 'SCC011'] },
      },
    },
  ],
}

describe('nwsAlerts.normalize', () => {
  it('keeps polygon geometry and derives states from UGC', () => {
    const [tor] = nwsAlerts.normalize(fixture)
    expect(tor.geometry?.type).toBe('Polygon')
    expect(tor.states).toEqual(['GA'])
  })

  it('handles zone-based alerts with null geometry and unknown severity', () => {
    const [, watch] = nwsAlerts.normalize(fixture)
    expect(watch.geometry).toBeNull()
    expect(watch.severity).toBe('Unknown')
    expect(watch.headline).toBe('Tornado Watch')
    expect(watch.states).toEqual(['GA', 'SC'])
  })
})
