import { describe, expect, it } from 'vitest'
import { goesTileUrl } from './goes'

describe('goesTileUrl', () => {
  it('builds the IEM XYZ template by default', () => {
    expect(goesTileUrl('iem')).toBe(
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png',
    )
  })

  it('appends a cache-busting query to IEM tiles', () => {
    expect(goesTileUrl('iem', 1234)).toBe(
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png?t=1234',
    )
  })

  it('builds the nowCOAST EPSG:3857 WMS template as fallback', () => {
    const url = goesTileUrl('nowcoast')
    expect(url.startsWith('https://nowcoast.noaa.gov/geoserver/satellite/wms?')).toBe(true)
    expect(url).toContain('layers=goes_longwave_imagery')
    expect(url).toContain('srs=EPSG:3857')
    expect(url).toContain('request=GetMap')
    expect(url).toContain('bbox={bbox-epsg-3857}')
    expect(url).not.toContain('?t=')
  })

  it('uses & to append cache-busting to the nowCOAST WMS query', () => {
    expect(goesTileUrl('nowcoast', 99)).toMatch(/&bbox=\{bbox-epsg-3857\}&t=99$/)
  })
})
