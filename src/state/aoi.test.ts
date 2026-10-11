import { beforeEach, describe, expect, it } from 'vitest'
import { useAoi } from './aoi'

const DIXIE = { west: -94, south: 29.5, east: -84.5, north: 37 }

describe('aoiRequest', () => {
  beforeEach(() => useAoi.getState().clearAoiRequest())

  it('records the requested bbox without touching the current AOI', () => {
    const before = useAoi.getState().bbox
    useAoi.getState().requestAoi(DIXIE)
    const s = useAoi.getState()
    expect(s.aoiRequest?.bbox).toEqual(DIXIE)
    expect(s.bbox).toBe(before)
  })

  it('gives repeat requests for the same bbox a new seq', () => {
    useAoi.getState().requestAoi(DIXIE)
    const first = useAoi.getState().aoiRequest
    useAoi.getState().requestAoi(DIXIE)
    expect(useAoi.getState().aoiRequest?.seq).toBe((first?.seq ?? 0) + 1)
  })

  it('clears', () => {
    useAoi.getState().requestAoi(DIXIE)
    useAoi.getState().clearAoiRequest()
    expect(useAoi.getState().aoiRequest).toBeNull()
  })
})
