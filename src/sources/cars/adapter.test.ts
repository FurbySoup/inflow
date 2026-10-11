import { afterEach, describe, expect, it, vi } from 'vitest'
import fixture from './fixtures/mapFeatures-wichita.json'
import iaFixture from './fixtures/mapFeatures-ia-mixed.json'
import mnFixture from './fixtures/mapFeatures-mn.json'
import inFixture from './fixtures/mapFeatures-in.json'
import {
  carsAdapter,
  indianaCameras,
  iowaCameras,
  kansasCameras,
  minnesotaCameras,
  nebraskaCameras,
  type CarsResponse,
} from './adapter'
import type { Bbox } from '../../types'

const raw = fixture as CarsResponse

describe('carsAdapter.normalize', () => {
  it('keeps only individual cameras that have a snapshot URL', () => {
    const cams = kansasCameras.normalize(raw)
    // Fixture: camera/2 has url:null, the last item is a cluster. Expect 3 cameras.
    expect(cams.map((c) => c.id)).toEqual(['camera/2394', 'camera/513', 'camera/2634'])
    expect(cams.every((c) => c.state === 'KS' && c.streamUrl === null)).toBe(true)
  })

  it('maps location as [lng, lat] and keeps the snapshot URL verbatim', () => {
    const cam = kansasCameras.normalize(raw).find((c) => c.id === 'camera/513')
    expect(cam?.location).toEqual([-97.11279, 37.71971])
    expect(cam?.snapshotUrl).toBe('https://kscam.carsprogram.org/plaza057.jpg?1791658260000')
    expect(cam?.title).toBe('Andover MP 57')
  })

  it('tags items with the adapter state', () => {
    const cams = nebraskaCameras.normalize(raw)
    expect(cams.length).toBe(3)
    expect(cams.every((c) => c.state === 'NE')).toBe(true)
  })

  it('returns an empty list for an empty or errored response', () => {
    expect(kansasCameras.normalize({ data: { mapFeaturesQuery: null } })).toEqual([])
    expect(kansasCameras.normalize({ errors: [{ message: 'nope' }] })).toEqual([])
  })
})

describe('CARS state fixtures (recorded 2026-10-11)', () => {
  it('IA: keeps the camera from a mixed camera + cluster response and skips the clusters', () => {
    const cams = iowaCameras.normalize(iaFixture as CarsResponse)
    expect(cams.map((c) => c.id)).toEqual(['camera/59634616'])
    expect(cams.every((c) => c.state === 'IA' && c.id.startsWith('camera/'))).toBe(true)
    expect(cams[0].snapshotUrl).toMatch(/^https:\/\/atmsqf\.iowadot\.gov\//)
  })

  it('MN: normalizes every camera with the MN state and a carsprogram snapshot', () => {
    const cams = minnesotaCameras.normalize(mnFixture as CarsResponse)
    expect(cams).toHaveLength(4)
    expect(cams.every((c) => c.state === 'MN' && c.id.startsWith('camera/'))).toBe(true)
    expect(cams.every((c) => c.snapshotUrl.startsWith('https://public.carsprogram.org/cameras/MN/'))).toBe(true)
  })

  it('IN: normalizes every camera with the IN state and .flv.png snapshots', () => {
    const cams = indianaCameras.normalize(inFixture as CarsResponse)
    expect(cams).toHaveLength(4)
    expect(cams.every((c) => c.state === 'IN' && c.id.startsWith('camera/'))).toBe(true)
    expect(cams.every((c) => c.snapshotUrl.startsWith('https://public.carsprogram.org/cameras/IN/'))).toBe(true)
    expect(cams.every((c) => c.snapshotUrl.endsWith('.flv.png'))).toBe(true)
  })
})

describe('carsAdapter.fetch', () => {
  const DES_MOINES: Bbox = { north: 41.75, south: 41.45, east: -93.45, west: -93.85 }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function sentBody(spy: { mock: { calls: unknown[][] } }) {
    const init = spy.mock.calls[0][1] as RequestInit
    return JSON.parse(String(init.body)) as { variables: { input: { zoom: number; north: number } } }
  }

  it.each([
    ['kansasCameras', kansasCameras, '/api/kandrive/graphql', 9],
    ['nebraskaCameras', nebraskaCameras, '/api/ne511/graphql', 9],
    ['iowaCameras', iowaCameras, '/api/511ia/graphql', 11],
    ['minnesotaCameras', minnesotaCameras, '/api/511mn/graphql', 9],
    ['indianaCameras', indianaCameras, '/api/511in/graphql', 13],
  ])('%s posts to its proxy route at zoom %i', async (_name, adapter, endpoint, zoom) => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 }))
    await adapter.fetch(DES_MOINES)
    expect(spy.mock.calls[0][0]).toBe(endpoint)
    expect(sentBody(spy).variables.input.zoom).toBe(zoom)
    expect(sentBody(spy).variables.input.north).toBe(41.75)
  })

  it('a custom zoom reaches the request body', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 }))
    const adapter = carsAdapter({ id: 'x', state: 'IA', endpoint: '/api/x/graphql', zoom: 12 })
    await adapter.fetch(DES_MOINES)
    expect(sentBody(spy).variables.input.zoom).toBe(12)
  })
})
