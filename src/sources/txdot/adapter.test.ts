import { describe, expect, it, vi } from 'vitest'
import aus from './fixtures/cctv-aus.json'
import bry from './fixtures/cctv-bry.json'
import snapshot from './fixtures/snapshot-fm734.json'
import { txdotCameras, snapshotProxyUrl, type TxdotListResponse } from './adapter'
import { districtsForBbox } from './districts'
import { snapshotDataUrl, type TxdotSnapshot } from './snapshot'

const AUSTIN = { west: -97.85, south: 30.2, east: -97.6, north: 30.4 }

describe('txdotCameras.normalize', () => {
  it('maps each TxDOT device to a CameraFeed with [lng, lat] and a proxied snapshot URL', () => {
    const cams = txdotCameras.normalize({ districts: [{ code: 'AUS', list: aus as TxdotListResponse }] })
    expect(cams).toHaveLength(7)
    // Title comes from `name`; the id and snapshot key come from `icd_Id` (which carries the trailing "449").
    const cam = cams.find((c) => c.title === 'IH-35 @ Posey Blvd')
    expect(cam?.id).toBe('txdot:AUS:IH-35 @ Posey Blvd 449')
    expect(cam?.location[0]).toBeCloseTo(-97.997828, 6)
    expect(cam?.location[1]).toBeCloseTo(29.817219, 6)
    expect(cam?.snapshotUrl).toBe(
      '/api/txdot/its/DistrictIts/GetCctvSnapshotByIcdId?icdId=IH-35%20%40%20Posey%20Blvd%20449&districtCode=AUS',
    )
    expect(cams.every((c) => c.state === 'TX' && c.streamUrl === null)).toBe(true)
  })

  it('keeps a device listed under two roadways only once', () => {
    const cams = txdotCameras.normalize({ districts: [{ code: 'BRY', list: bry as TxdotListResponse }] })
    const ids = cams.map((c) => c.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(ids.filter((id) => id.includes('Chappell Hill'))).toHaveLength(1)
  })

  it('tells districts apart by code even when icd_Id repeats', () => {
    const list = aus as TxdotListResponse
    const cams = txdotCameras.normalize({
      districts: [
        { code: 'AUS', list },
        { code: 'SAT', list },
      ],
    })
    expect(cams).toHaveLength(14)
    expect(cams.some((c) => c.snapshotUrl.endsWith('districtCode=SAT'))).toBe(true)
  })

  it('returns an empty list for a district with no cameras', () => {
    expect(txdotCameras.normalize({ districts: [{ code: 'AUS', list: {} }] })).toEqual([])
    expect(txdotCameras.normalize({ districts: [] })).toEqual([])
  })

  it('builds an encoded snapshot proxy URL', () => {
    expect(snapshotProxyUrl('FM-734 @ US-290 EB', 'AUS')).toBe(
      '/api/txdot/its/DistrictIts/GetCctvSnapshotByIcdId?icdId=FM-734%20%40%20US-290%20EB&districtCode=AUS',
    )
  })
})

describe('district selection', () => {
  it('selects Austin districts for an Austin-area AOI', () => {
    const codes = districtsForBbox(AUSTIN)
    expect(codes).toContain('AUS')
    expect(codes).not.toContain('ELP')
  })

  it('selects nothing for an AOI outside Texas', () => {
    expect(districtsForBbox({ west: -85.6, south: 30.4, east: -78.5, north: 35.3 })).toEqual([])
  })

  it('makes no requests when no district intersects the AOI', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const raw = await txdotCameras.fetch({ west: -85.6, south: 30.4, east: -78.5, north: 35.3 })
    expect(raw).toEqual({ districts: [] })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('snapshotDataUrl', () => {
  it('wraps the base64 snippet as a JPEG data URL that decodes to JPEG bytes', () => {
    const url = snapshotDataUrl(snapshot as TxdotSnapshot)
    expect(url.startsWith('data:image/jpeg;base64,/9j/')).toBe(true)
    const bytes = atob(url.slice('data:image/jpeg;base64,'.length))
    expect(bytes.charCodeAt(0)).toBe(0xff)
    expect(bytes.charCodeAt(1)).toBe(0xd8)
  })

  it('throws when the response has no image', () => {
    expect(() => snapshotDataUrl({ icd_Id: 'x' })).toThrow()
    expect(() => snapshotDataUrl({ snippet: '' })).toThrow()
  })
})
