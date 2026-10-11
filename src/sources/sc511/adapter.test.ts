import { describe, expect, it } from 'vitest'
import fixture from './fixtures/icons.cameras-trimmed.json'
import { southCarolinaCameras, type Sc511Collection, type Sc511Raw } from './adapter'

const collection = fixture as Sc511Collection
// Columbia AOI: contains the I-77 and I-26 fixture cameras.
const columbia = { west: -81.2, south: 33.9, east: -80.9, north: 34.2 }
const raw = (bbox = columbia): Sc511Raw => ({ bbox, features: collection.features })

describe('southCarolinaCameras.normalize', () => {
  it('keeps active cameras inside the bbox as SC CameraFeeds', () => {
    const cams = southCarolinaCameras.normalize(raw())
    expect(cams.map((c) => c.id)).toEqual(['sc511:2735', 'sc511:e72068cf-d2a0-11e6-8996-0123456789ab', 'sc511:e72327e5-d2a0-11e6-8996-0123456789ab', 'sc511:e72327e6-d2a0-11e6-8996-0123456789ab'])
    expect(cams.every((c) => c.state === 'SC' && c.streamUrl === null)).toBe(true)
  })

  it('filters by bbox', () => {
    // Narrow box around the I-77 camera only (lon -80.997, lat 33.949).
    const cams = southCarolinaCameras.normalize(raw({ west: -81.01, south: 33.94, east: -80.99, north: 33.96 }))
    expect(cams.map((c) => c.id)).toEqual(['sc511:2735'])
  })

  it('skips inactive cameras', () => {
    const cams = southCarolinaCameras.normalize(raw())
    // Synthetic fixture record e7208fd0: copied from a real camera (I-26 W @ MM 106) with active flipped to false.
    // Upstream had no inactive cameras on 2026-10-11.
    expect(cams.find((c) => c.id.endsWith('e7208fd0-d2a0-11e6-8996-0123456789ab'))).toBeUndefined()
  })

  it('uses the description as title, falling back to route and direction', () => {
    const cams = southCarolinaCameras.normalize(raw())
    expect(cams.find((c) => c.id === 'sc511:2735')?.title).toBe('I-77 S @ MM 4.9')
    // Synthetic fixture record e72327e6: copied from a real camera with description blanked, route/direction I-26 EB.
    expect(cams.find((c) => c.id === 'sc511:e72327e6-d2a0-11e6-8996-0123456789ab')?.title).toBe('I-26 EB')
  })

  it('maps location as [lng, lat] and keeps the image_url verbatim', () => {
    const cam = southCarolinaCameras.normalize(raw()).find((c) => c.id === 'sc511:2735')
    expect(cam?.location).toEqual([-80.997286, 33.948503])
    expect(cam?.snapshotUrl).toBe('https://scdotsnap.us-east-1.skyvdn.com/thumbs/10002.flv.png')
  })

  it('returns an empty list when nothing is in the bbox', () => {
    expect(southCarolinaCameras.normalize(raw({ west: 0, south: 0, east: 1, north: 1 }))).toEqual([])
  })
})
