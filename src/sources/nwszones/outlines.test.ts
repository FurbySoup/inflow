import { describe, expect, it } from 'vitest'
import type { Alert } from '../../types'
import { allOutlineZoneUrls, buildOutlineFeatures, outlineZoneUrls, zoneBasedAlerts } from './outlines'
import type { ZoneShape } from './zones'

const COUNTY_A = 'https://api.weather.gov/zones/county/GAC033'
const COUNTY_B = 'https://api.weather.gov/zones/county/SCC009'
const FORECAST = 'https://api.weather.gov/zones/forecast/GAZ087'
const FORECAST_B = 'https://api.weather.gov/zones/forecast/GAZ088'
const FIRE = 'https://api.weather.gov/zones/fire/GAZ087'

function alert(over: Partial<Alert>): Alert {
  return {
    id: 'urn:oid:x',
    event: 'Tornado Watch',
    severity: 'Severe',
    headline: 'h',
    areaDesc: 'a',
    onset: null,
    expires: null,
    geometry: null,
    states: ['GA'],
    zones: [],
    ...over,
  }
}

const polygon: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
}

describe('zoneBasedAlerts', () => {
  it('keeps geometry-less alerts that touch the AOI states', () => {
    const watch = alert({ id: 'w', states: ['GA', 'SC'] })
    const stormOnly = alert({ id: 's', geometry: polygon })
    const otherState = alert({ id: 'o', states: ['TX'] })
    expect(zoneBasedAlerts([watch, stormOnly, otherState], ['SC']).map((a) => a.id)).toEqual(['w'])
  })

  it('outlines watches and warnings but not statements or advisories', () => {
    const kept = ['Flood Watch', 'Tornado Watch', 'Tropical Storm Warning', 'Flood Warning'].map((event, i) =>
      alert({ id: `k${i}`, event, states: ['GA'] }),
    )
    const dropped = ['Rip Current Statement', 'Coastal Flood Advisory', 'High Surf Advisory', 'Beach Hazards Statement'].map(
      (event, i) => alert({ id: `d${i}`, event, states: ['GA'] }),
    )
    expect(zoneBasedAlerts([...kept, ...dropped], ['GA']).map((a) => a.id)).toEqual(['k0', 'k1', 'k2', 'k3'])
  })
})

describe('outlineZoneUrls', () => {
  it('uses county zones when the alert is county-only', () => {
    expect(outlineZoneUrls(alert({ zones: [COUNTY_A, COUNTY_B] }))).toEqual([COUNTY_A, COUNTY_B])
  })

  it('uses forecast zones when the alert is forecast-only (flood watch)', () => {
    expect(outlineZoneUrls(alert({ zones: [FORECAST, FORECAST_B] }))).toEqual([FORECAST, FORECAST_B])
  })

  it('prefers county zones when both are listed (mixed)', () => {
    expect(outlineZoneUrls(alert({ zones: [FORECAST, COUNTY_A, FIRE] }))).toEqual([COUNTY_A])
  })

  it('returns nothing for fire-only zones', () => {
    expect(outlineZoneUrls(alert({ zones: [FIRE] }))).toEqual([])
  })

  it('returns nothing when the alert lists no zones', () => {
    expect(outlineZoneUrls(alert({ zones: [] }))).toEqual([])
  })
})

describe('allOutlineZoneUrls', () => {
  it('dedupes zones shared between alerts', () => {
    const a = alert({ id: '1', zones: [COUNTY_A, COUNTY_B] })
    const b = alert({ id: '2', zones: [COUNTY_A] })
    expect(allOutlineZoneUrls([a, b])).toEqual([COUNTY_A, COUNTY_B])
  })
})

describe('buildOutlineFeatures', () => {
  const shapes = new Map<string, ZoneShape>([['county/GAC033', { key: 'county/GAC033', geometry: polygon }]])

  it('emits one feature per resolved county with alert props', () => {
    const a = alert({ id: 'tw', event: 'Tornado Watch', severity: 'Severe', zones: [COUNTY_A] })
    expect(buildOutlineFeatures([a], shapes)).toEqual([
      {
        type: 'Feature',
        geometry: polygon,
        properties: { alertId: 'tw', event: 'Tornado Watch', severity: 'Severe' },
      },
    ])
  })

  it('draws forecast-only alerts from their forecast shapes', () => {
    const forecastShapes = new Map<string, ZoneShape>([['forecast/GAZ087', { key: 'forecast/GAZ087', geometry: polygon }]])
    const a = alert({ id: 'fw', event: 'Flood Watch', zones: [FORECAST] })
    expect(buildOutlineFeatures([a], forecastShapes)).toHaveLength(1)
  })

  it('does not draw a forecast zone from a county shape with the same id', () => {
    const a = alert({ zones: ['https://api.weather.gov/zones/forecast/GAC033'] })
    expect(buildOutlineFeatures([a], shapes)).toEqual([])
  })

  it('skips zones whose shape did not load', () => {
    const a = alert({ zones: [COUNTY_A, COUNTY_B] })
    expect(buildOutlineFeatures([a], shapes)).toHaveLength(1)
  })
})
