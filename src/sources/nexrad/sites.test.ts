import { describe, expect, it } from 'vitest'
import nexradJson from './fixtures/nexrad-sites.geojson?raw'
import {
  greatCircleKm,
  nearestSite,
  normalizeSites,
  weatherWiseUrl,
  type NexradSite,
  type NexradSitesResponse,
} from './sites'

const raw = JSON.parse(nexradJson) as NexradSitesResponse
const sites = normalizeSites(raw)
const byId = (sid: string) => sites.find((s) => s.sid === sid)

describe('normalizeSites', () => {
  it('keeps every fixture site with its name and lng/lat location', () => {
    const ffc = byId('FFC')
    expect(ffc).toEqual({ sid: 'FFC', name: 'Atlanta', location: [-84.566, 33.363], lower48: true })
    expect(byId('TLX')?.location).toEqual([-97.2779, 35.3334])
  })

  it('flags only contiguous-US sites as lower48', () => {
    expect(byId('PAH')?.lower48).toBe(true)
    expect(byId('TBW')?.lower48).toBe(true)
    expect(byId('ABC')?.lower48).toBe(false) // Alaska
    expect(byId('HMO')?.lower48).toBe(false) // Hawaii
    expect(byId('JUA')?.lower48).toBe(false) // Puerto Rico
    expect(byId('GUA')?.lower48).toBe(false) // Guam
    expect(byId('KSG')?.lower48).toBe(false) // Korea: no state, country KR
  })

  it('drops offline sites and features without a point', () => {
    const offline: NexradSitesResponse = {
      features: [
        { geometry: { type: 'Point', coordinates: [-80, 35] }, properties: { sid: 'XXX', sname: 'Off', state: 'NC', country: 'US', online: false } },
        { geometry: null, properties: { sid: 'YYY', sname: 'Nowhere', state: 'NC', country: 'US', online: true } },
        { geometry: { type: 'Point', coordinates: [-80, 35] }, properties: { sid: 'ZZZ', sname: 'On', state: 'NC', country: 'US', online: true } },
      ],
    }
    expect(normalizeSites(offline).map((s) => s.sid)).toEqual(['ZZZ'])
  })
})

describe('greatCircleKm', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(greatCircleKm([-84, 33], [-84, 33])).toBe(0)
    expect(greatCircleKm([-84, 33], [-84, 34])).toBeGreaterThan(110)
    expect(greatCircleKm([-84, 33], [-84, 34])).toBeLessThan(112)
  })
})

describe('nearestSite', () => {
  it('picks FFC for central Atlanta', () => {
    expect(nearestSite(sites, [-84.39, 33.75])?.sid).toBe('FFC')
  })

  it('picks TLX for Oklahoma City', () => {
    expect(nearestSite(sites, [-97.5164, 35.4676])?.sid).toBe('TLX')
  })

  it('picks CLX, not FFC, for the default GA/SC AOI centre (-82.05, 32.85)', () => {
    // WP-18 expected FFC here. FFC is ~240 km from this centre; CLX (Charleston) is ~97 km and JGX ~123 km.
    expect(nearestSite(sites, [-82.05, 32.85])?.sid).toBe('CLX')
  })

  it('returns null when there are no sites', () => {
    expect(nearestSite([], [-84, 33])).toBeNull()
  })
})

describe('weatherWiseUrl', () => {
  it('builds the K-prefixed RADAR deep link for a lower-48 site', () => {
    expect(weatherWiseUrl(byId('FFC') as NexradSite)).toBe(
      'https://web.weatherwise.app/#m=RADAR&rt=KFFC&rp=N0S&map=8/33.363/-84.566',
    )
  })

  it('uses the K prefix even for sids that start with P or T', () => {
    expect(weatherWiseUrl(byId('PAH') as NexradSite)).toContain('rt=KPAH&')
  })

  it('is null for Alaska, Hawaii, territories and non-US sites', () => {
    expect(weatherWiseUrl(byId('ABC') as NexradSite)).toBeNull()
    expect(weatherWiseUrl(byId('HMO') as NexradSite)).toBeNull()
    expect(weatherWiseUrl(byId('KSG') as NexradSite)).toBeNull()
  })
})
