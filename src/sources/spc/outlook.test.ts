import { describe, expect, it } from 'vitest'
import outlookJson from './fixtures/outlook.geojson?raw'
import emptyDayJson from './fixtures/outlook-d4-empty.geojson?raw'
import { outlookUrl, outlookWindow, spcOutlook, spcOutlookDay } from './outlook'

describe('spcOutlook.normalize', () => {
  it('returns the recorded outlook features with their label and colour properties', () => {
    const features = spcOutlook.normalize(JSON.parse(outlookJson))
    expect(features.map((f) => f.properties?.LABEL)).toEqual(['TSTM', 'MRGL', 'SLGT'])
    expect(features[2].properties?.fill).toBe('#FFE066')
    expect(features[2].properties?.stroke).toBe('#DDAA00')
  })

  it('drops the empty-day placeholder feature (GeometryCollection with DN 0)', () => {
    const features = spcOutlookDay(4).normalize(JSON.parse(emptyDayJson))
    expect(features).toEqual([])
  })

  it('keeps real polygons and drops the empty placeholder when both are present', () => {
    const fc = JSON.parse(outlookJson)
    const mixed = { ...fc, features: [...fc.features, ...JSON.parse(emptyDayJson).features] }
    expect(spcOutlookDay(1).normalize(mixed).map((f) => f.properties?.LABEL)).toEqual(['TSTM', 'MRGL', 'SLGT'])
  })
})

describe('spcOutlookDay', () => {
  it('gives each day a stable id, memoized per day, with 2 min refresh for D1-3 and 30 min for D4-8', () => {
    expect(spcOutlookDay(2)).toBe(spcOutlookDay(2))
    expect(spcOutlookDay(2).id).toBe('spc-outlook-d2')
    expect(spcOutlookDay(2).refreshMs).toBe(120_000)
    expect(spcOutlookDay(3).refreshMs).toBe(120_000)
    expect(spcOutlookDay(4).id).toBe('spc-outlook-d4')
    expect(spcOutlookDay(8).refreshMs).toBe(30 * 60_000)
  })

  it('keeps the Day 1 adapter as the spcOutlook export', () => {
    expect(spcOutlook).toBe(spcOutlookDay(1))
  })
})

describe('outlookUrl', () => {
  it('uses the categorical product for D1-3 and the probabilistic product for D4-8', () => {
    expect(outlookUrl(1)).toBe('https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson')
    expect(outlookUrl(3)).toBe('https://www.spc.noaa.gov/products/outlook/day3otlk_cat.nolyr.geojson')
    expect(outlookUrl(6)).toBe('https://www.spc.noaa.gov/products/exper/day4-8/day6prob.nolyr.geojson')
  })
})

describe('outlookWindow', () => {
  it('reads the raw VALID and EXPIRE of the first feature', () => {
    const features = spcOutlook.normalize(JSON.parse(outlookJson))
    const first = features[0].properties
    expect(outlookWindow(features)).toEqual({ valid: first?.VALID, expire: first?.EXPIRE })
    expect(first?.VALID).toMatch(/^\d{12}$/)
  })

  it('is null when the day has no polygons', () => {
    expect(outlookWindow([])).toBeNull()
  })
})
