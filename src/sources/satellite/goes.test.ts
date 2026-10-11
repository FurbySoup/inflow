import { describe, expect, it } from 'vitest'
import { DEFAULT_AOI } from '../../state/aoi'
import { goesAttribution, goesSector, goesTileUrl } from './goes'

const EAST_IEM =
  'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png'
const WEST_IEM =
  'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_west_conus_ch13/{z}/{x}/{y}.png'

/** A 1° wide box whose centre is at `centreLng`. */
const boxAt = (centreLng: number) => ({ west: centreLng - 0.5, east: centreLng + 0.5, south: 35, north: 36 })

describe('goesSector', () => {
  it('is east just east of 105°W', () => {
    expect(goesSector(boxAt(-104.9))).toBe('east')
  })

  it('is west just west of 105°W', () => {
    expect(goesSector(boxAt(-105.1))).toBe('west')
  })

  it('is east for the default GA/SC AOI', () => {
    expect(goesSector(DEFAULT_AOI)).toBe('east')
  })

  it('uses the centre longitude, not the west edge', () => {
    // West edge is -106 (west of the line) but the centre is -104.5, so it is east.
    expect(goesSector({ west: -106, east: -103, south: 35, north: 36 })).toBe('east')
  })
})

describe('goesTileUrl', () => {
  it('builds the GOES-East IEM XYZ template', () => {
    expect(goesTileUrl('iem', 'east')).toBe(EAST_IEM)
  })

  it('builds the GOES-West IEM XYZ template', () => {
    expect(goesTileUrl('iem', 'west')).toBe(WEST_IEM)
  })

  it('appends a cache-busting query to IEM tiles', () => {
    expect(goesTileUrl('iem', 'east', 1234)).toBe(`${EAST_IEM}?t=1234`)
    expect(goesTileUrl('iem', 'west', 1234)).toBe(`${WEST_IEM}?t=1234`)
  })

  it('builds the nowCOAST EPSG:3857 WMS template as fallback, same for both sectors', () => {
    const url = goesTileUrl('nowcoast', 'east')
    expect(url.startsWith('https://nowcoast.noaa.gov/geoserver/satellite/wms?')).toBe(true)
    expect(url).toContain('layers=goes_longwave_imagery')
    expect(url).toContain('srs=EPSG:3857')
    expect(url).toContain('request=GetMap')
    expect(url).toContain('bbox={bbox-epsg-3857}')
    expect(url).not.toContain('?t=')
    expect(goesTileUrl('nowcoast', 'west')).toBe(url)
  })

  it('uses & to append cache-busting to the nowCOAST WMS query', () => {
    expect(goesTileUrl('nowcoast', 'west', 99)).toMatch(/&bbox=\{bbox-epsg-3857\}&t=99$/)
  })
})

describe('goesAttribution', () => {
  it('names the sector in use', () => {
    expect(goesAttribution('east')).toBe('GOES-East via IEM / NOAA')
    expect(goesAttribution('west')).toBe('GOES-West via IEM / NOAA')
  })
})
