import { describe, expect, it } from 'vitest'
import fixture from './fixtures/mapFeatures-wichita.json'
import { kansasCameras, nebraskaCameras, type CarsResponse } from './adapter'

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
