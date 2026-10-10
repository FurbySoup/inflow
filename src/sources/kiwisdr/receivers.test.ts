import { describe, expect, it } from 'vitest'
import fixture from './fixtures/kiwisdr_com.js?raw'
import {
  haversineKm,
  nearestCbReceivers,
  normalizeDirectory,
  receiverFeeds,
  type KiwiReceiver,
} from './receivers'

const ATLANTA: [number, number] = [-84.388, 33.749]

describe('normalizeDirectory', () => {
  const receivers = normalizeDirectory(fixture)

  it('parses the real trimmed directory (trailing comma, string fields)', () => {
    expect(receivers).toHaveLength(9)
    const bham = receivers.find((r) => r.id === '58a15ffb4678')!
    expect(bham.location).toEqual([-86.812, 33.3639]) // (lat, lon) in gps -> [lng, lat]
    expect(bham.bands).toEqual([0, 30_000_000])
    expect(bham.url).toBe('http://22448.proxy.kiwisdr.com')
  })

  it('drops offline, unparseable gps and unparseable bands', () => {
    const js = `var kiwisdr_com =
[
 {"id":"a","name":"Off","url":"http://a","gps":"(33, -84)","bands":"0-30000000","offline":"yes","users":"0","users_max":"8"},
 {"id":"b","name":"Bad gps","url":"http://b","gps":"nowhere","bands":"0-30000000","offline":"no","users":"0","users_max":"8"},
 {"id":"c","name":"Bad bands","url":"http://c","gps":"(33, -84)","bands":"all","offline":"no","users":"0","users_max":"8"},
 {"id":"d","name":"OK","url":"http://d/","gps":"(33, -84)","bands":"0-30000000","offline":"no","users":"1","users_max":"8"},
]
;`
    const out = normalizeDirectory(js)
    expect(out.map((r) => r.id)).toEqual(['d'])
    expect(out[0].url).toBe('http://d')
  })
})

const rx = (over: Partial<KiwiReceiver> & { id: string; location: [number, number] }): KiwiReceiver => ({
  name: over.id,
  url: `http://${over.id}`,
  bands: [0, 30_000_000],
  users: 0,
  usersMax: 8,
  ...over,
})

describe('nearestCbReceivers', () => {
  it('takes the 5 nearest receivers that cover 27 MHz, sorted by distance', () => {
    const receivers = [
      rx({ id: 'far', location: [-100, 40] }),
      rx({ id: 'n1', location: [-84.5, 33.8] }),
      rx({ id: 'n2', location: [-80, 32.8] }),
      rx({ id: 'n3', location: [-86, 33.4] }),
      rx({ id: 'n4', location: [-78.6, 35.8] }),
      rx({ id: 'n5', location: [-81.6, 30.3] }),
      rx({ id: 'n6', location: [-83.5, 34.0] }),
      rx({ id: 'hfOnly', location: [-84.39, 33.75], bands: [144_000_000, 148_000_000] }),
    ]
    const near = nearestCbReceivers(receivers, ATLANTA)
    expect(near).toHaveLength(5)
    expect(near.map((n) => n.receiver.id)).not.toContain('hfOnly')
    expect(near.map((n) => n.receiver.id)).not.toContain('far')
    for (let i = 1; i < near.length; i++) expect(near[i].km).toBeGreaterThanOrEqual(near[i - 1].km)
  })

  it('computes great-circle distance', () => {
    // Atlanta to Charleston SC is roughly 428 km great-circle
    const km = haversineKm(ATLANTA, [-79.9311, 32.7765])
    expect(km).toBeGreaterThan(420)
    expect(km).toBeLessThan(435)
  })
})

describe('receiverFeeds', () => {
  it('gives CB 19 preset link for every receiver and 2M only when 144 MHz is covered', () => {
    const cbOnly = receiverFeeds(rx({ id: 'x', location: [-84, 33] }))
    expect(cbOnly.map((f) => f.kind)).toEqual(['cb'])
    expect(cbOnly[0].pageUrl).toBe('http://x/?f=27185am')
    expect(cbOnly[0].streamUrl).toBeNull()

    const both = receiverFeeds(rx({ id: 'y', location: [-84, 33], bands: [0, 150_000_000] }))
    expect(both.map((f) => f.kind)).toEqual(['cb', 'ham'])
  })
})
