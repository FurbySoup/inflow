import { describe, expect, it } from 'vitest'
import outlookJson from './fixtures/outlook.geojson?raw'
import { spcOutlook } from './outlook'

describe('spcOutlook.normalize', () => {
  it('returns the recorded outlook features with their label and colour properties', () => {
    const features = spcOutlook.normalize(JSON.parse(outlookJson))
    expect(features.map((f) => f.properties?.LABEL)).toEqual(['TSTM', 'MRGL', 'SLGT'])
    expect(features[2].properties?.fill).toBe('#FFE066')
    expect(features[2].properties?.stroke).toBe('#DDAA00')
  })
})
