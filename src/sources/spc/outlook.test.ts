import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AOI } from '../../state/aoi'
import outlookJson from './fixtures/outlook.geojson?raw'
import emptyDayJson from './fixtures/outlook-d4-empty.geojson?raw'
import { emptyDayLabel, outlookUrl, outlookWindow, spcOutlook, spcOutlookDay } from './outlook'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// A minimal stand-in for fetch's Response: only what the adapter reads.
function stubFetch(respond: () => { ok: boolean; status: number; json: () => Promise<unknown> }) {
  const fn = vi.fn(async () => respond())
  vi.stubGlobal('fetch', fn)
  return fn
}
const okJson = (text: string) => () => ({ ok: true, status: 200, json: async () => JSON.parse(text) as unknown })

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

  it('reads the VALID of an empty day from its raw placeholder feature', () => {
    const raw = JSON.parse(emptyDayJson) as GeoJSON.FeatureCollection
    expect(outlookWindow(raw.features)).toEqual({ valid: '202610141200', expire: '202610151200' })
  })
})

describe('emptyDayLabel', () => {
  it('returns the LABEL of the empty Day 4 placeholder', () => {
    expect(emptyDayLabel(JSON.parse(emptyDayJson))).toBe('Predictability Too Low')
  })

  it('returns null when the raw day has polygons', () => {
    expect(emptyDayLabel(JSON.parse(outlookJson))).toBeNull()
  })
})

describe('spcOutlookDay fetch memo', () => {
  it('makes one network call for two fetches inside the refresh window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
    const fetchMock = stubFetch(okJson(outlookJson))
    const adapter = spcOutlookDay(6)
    const first = await adapter.fetch(DEFAULT_AOI)
    vi.setSystemTime(new Date('2026-10-11T12:01:30Z'))
    const second = await adapter.fetch(DEFAULT_AOI)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('fetches again once the refresh window has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
    const fetchMock = stubFetch(okJson(outlookJson))
    const adapter = spcOutlookDay(2)
    await adapter.fetch(DEFAULT_AOI)
    vi.setSystemTime(new Date('2026-10-11T12:02:01Z'))
    await adapter.fetch(DEFAULT_AOI)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failure, so the next fetch tries again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
    let fail = true
    const fetchMock = stubFetch(() =>
      fail
        ? { ok: false, status: 503, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => JSON.parse(emptyDayJson) as unknown },
    )
    const adapter = spcOutlookDay(8)
    await expect(adapter.fetch(DEFAULT_AOI)).rejects.toThrow('SPC outlook D8 503')
    fail = false
    await expect(adapter.fetch(DEFAULT_AOI)).resolves.toMatchObject({ type: 'FeatureCollection' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
