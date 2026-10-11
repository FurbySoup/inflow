import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pointsFixture from './fixtures/points-ffc.json'
import ffc from './fixtures/hwo-ffc.json'
import tsa from './fixtures/hwo-tsa.json'
import { fullTextUrl, isSpotterActivation, nwsHwo, parseHwo, resetHwoCache, type NwsHwoProduct } from './hwo'
import type { NwsPointResponse } from './points'

const atlanta = { west: -84.9, south: 33.2, east: -83.9, north: 34.2 }
const offshore = { west: -61, south: 29, east: -59, north: 31 }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const pointsFor = (cwa: string): NwsPointResponse =>
  ({ properties: { ...pointsFixture.properties, cwa } }) as NwsPointResponse

/** Routes /points to `points` and /latest to `latest`; counts the product requests. */
function stubNws(points: () => Response, latest: () => Response) {
  const mock = vi.fn<typeof fetch>(async (input) => (String(input).includes('/points/') ? points() : latest()))
  vi.stubGlobal('fetch', mock)
  return mock
}
const latestCalls = (mock: ReturnType<typeof stubNws>) =>
  mock.mock.calls.filter(([u]) => String(u).includes('/latest')).length

beforeEach(() => resetHwoCache())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseHwo', () => {
  it('splits the FFC product into Day One, Days Two to Seven and spotter text', () => {
    const s = parseHwo(ffc.productText)
    expect(s.dayOne).toBe(
      'Gusty winds this afternoon may cause additional tree damage in areas that received heavy rain from Isaias. Additional hazards are not expected.',
    )
    expect(s.daysTwoToSeven).toBe('No hazardous weather conditions expected.')
    expect(s.spotter).toBe(
      'Spotter activation will not be needed through tonight.\n\nSpotter activation is not requested but spotters are encouraged to submit reports of severe weather through the web by going to weather.gov/atlanta. Please relay any information about observed severe weather to the NWS while following all local and state guidelines.',
    )
  })

  it('keeps the TSA sub-headings and finds the spotter line inside Day One', () => {
    const s = parseHwo(tsa.productText)
    expect(s.dayOne.startsWith('FIRE WEATHER DANGER. RISK...Limited. AREA...Northeast Oklahoma.')).toBe(true)
    expect(s.dayOne).toContain('SPOTTER AND EMERGENCY MANAGEMENT ACTION STATEMENT... Spotter Activation Not Expected.')
    expect(s.daysTwoToSeven.startsWith('MONDAY...High Wind Potential. TUESDAY...Thunderstorm Potential.')).toBe(true)
    expect(s.spotter).toBe('SPOTTER AND EMERGENCY MANAGEMENT ACTION STATEMENT... Spotter Activation Not Expected.')
    expect(s.dayOne).not.toContain('$$')
  })

  it('returns empty strings for text with no sections', () => {
    expect(parseHwo('\n000\nFLUS42 KFFC 111756\n')).toEqual({ dayOne: '', daysTwoToSeven: '', spotter: '' })
  })
})

describe('spotter flag', () => {
  it('is false for the real negative wordings (FFC "will not be needed", TSA "Not Expected")', () => {
    expect(isSpotterActivation(parseHwo(ffc.productText).spotter)).toBe(false)
    expect(isSpotterActivation(parseHwo(tsa.productText).spotter)).toBe(false)
  })

  it('is true when the spotter section asks for activation (synthetic text: no real product in the fixtures)', () => {
    const synthetic = `.DAY ONE...Tonight.\n\nSevere storms likely.\n\n.SPOTTER INFORMATION STATEMENT...\n\nSpotter activation will be needed this evening.\n\n$$\n`
    const product: NwsHwoProduct = { ...ffc, productText: synthetic }
    const [item] = nwsHwo.normalize({ cwa: 'FFC', product })
    expect(item.spotterActivation).toBe(true)
  })
})

describe('nwsHwo.normalize', () => {
  it('maps the FFC product to one item with the full-text link', () => {
    const [item] = nwsHwo.normalize({ cwa: 'FFC', product: ffc })
    expect(item).toEqual({
      cwa: 'FFC',
      issued: Date.UTC(2026, 9, 11, 17, 56),
      dayOne: parseHwo(ffc.productText).dayOne,
      daysTwoToSeven: 'No hazardous weather conditions expected.',
      spotterActivation: false,
      url: 'https://forecast.weather.gov/product.php?site=FFC&issuedby=FFC&product=HWO&format=txt',
    })
    expect(item.url).toBe(fullTextUrl('FFC'))
  })

  it('returns no items with no CWA (offshore) or no product (office has no HWO)', () => {
    expect(nwsHwo.normalize(null)).toEqual([])
    expect(nwsHwo.normalize({ cwa: 'CAE', product: null })).toEqual([])
  })
})

describe('nwsHwo.fetch', () => {
  it('returns null with no CWA (offshore points HTTP 500) and normalizes to []', async () => {
    stubNws(() => new Response('{}', { status: 500 }), () => json(ffc))
    const raw = await nwsHwo.fetch(offshore)
    expect(raw).toBeNull()
    expect(nwsHwo.normalize(raw)).toEqual([])
  })

  it('treats a 500 from /latest (no HWO for the office) as no product, not an error', async () => {
    const aoi = { west: -81.3, south: 33.8, east: -80.6, north: 34.2 }
    stubNws(() => json(pointsFor('CAE')), () => new Response('', { status: 500 }))
    const raw = await nwsHwo.fetch(aoi)
    expect(raw).toEqual({ cwa: 'CAE', product: null })
    expect(nwsHwo.normalize(raw)).toEqual([])
  })

  // Each test below uses its own AOI: nwsPoint caches resolved centres for the whole module.
  it('treats a 404 from /latest as no product', async () => {
    const mobile = { west: -88.4, south: 30.5, east: -87.9, north: 30.9 }
    stubNws(() => json(pointsFor('MOB')), () => new Response('', { status: 404 }))
    expect(nwsHwo.normalize(await nwsHwo.fetch(mobile))).toEqual([])
  })

  it('throws on other failures so the strip can show HWO UNAVAILABLE', async () => {
    const houston = { west: -95.8, south: 29.5, east: -95.0, north: 30.1 }
    stubNws(() => json(pointsFor('HGX')), () => new Response('', { status: 503 }))
    await expect(nwsHwo.fetch(houston)).rejects.toThrow('NWS HWO 503')
  })

  it('a 200 without productText normalizes to []', async () => {
    const dallas = { west: -97.2, south: 32.5, east: -96.5, north: 33.1 }
    stubNws(() => json(pointsFor('FWD')), () => json({ id: 'x' }))
    expect(nwsHwo.normalize(await nwsHwo.fetch(dallas))).toEqual([])
  })

  it('a second fetch for the same office reuses the product (no new /latest request)', async () => {
    const shifted = { west: -84.7, south: 33.4, east: -83.7, north: 34.4 }
    const mock = stubNws(() => json(pointsFor('FFC')), () => json(ffc))
    const first = await nwsHwo.fetch(atlanta)
    const second = await nwsHwo.fetch(shifted)
    expect(latestCalls(mock)).toBe(1)
    expect(second).toEqual(first)
  })

  it('asks for the product again once the cache is older than its window', async () => {
    const mock = stubNws(() => json(pointsFor('FFC')), () => json(ffc))
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await nwsHwo.fetch(atlanta)
    vi.spyOn(Date, 'now').mockReturnValue(now + 26 * 60_000)
    await nwsHwo.fetch(atlanta)
    expect(latestCalls(mock)).toBe(2)
  })
})
