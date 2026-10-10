import { describe, expect, it } from 'vitest'
import {
  FRAME_OFFSETS_MIN,
  formatUtcHHMM,
  frameLayerName,
  frameSourceId,
  frameTileUrl,
  frameTimeMs,
  parseValidTime,
} from './frames'

const VALID = Date.parse('2026-10-10T18:50:00Z')

describe('radar frames', () => {
  it('has 11 frames, oldest first, ending at the newest', () => {
    expect(FRAME_OFFSETS_MIN).toHaveLength(11)
    expect(FRAME_OFFSETS_MIN[0]).toBe(50)
    expect(FRAME_OFFSETS_MIN[FRAME_OFFSETS_MIN.length - 1]).toBe(0)
  })

  it('names sources and IEM layers', () => {
    expect(frameSourceId(50)).toBe('radar-m50')
    expect(frameSourceId(5)).toBe('radar-m05')
    expect(frameSourceId(0)).toBe('radar-m00')
    expect(frameLayerName(5)).toBe('nexrad-n0q-900913-m05m')
    expect(frameLayerName(0)).toBe('nexrad-n0q-900913')
    expect(frameTileUrl(0)).toContain('/nexrad-n0q-900913/{z}/{x}/{y}.png')
    expect(frameTileUrl(10, 123)).toContain('/nexrad-n0q-900913-m10m/{z}/{x}/{y}.png?t=123')
  })

  it('computes frame valid times and UTC labels', () => {
    expect(formatUtcHHMM(frameTimeMs(VALID, 0))).toBe('18:50Z')
    expect(formatUtcHHMM(frameTimeMs(VALID, 50))).toBe('18:00Z')
    expect(formatUtcHHMM(frameTimeMs(VALID, 5))).toBe('18:45Z')
  })

  it('wraps across midnight UTC', () => {
    const justAfterMidnight = Date.parse('2026-10-11T00:05:00Z')
    expect(formatUtcHHMM(frameTimeMs(justAfterMidnight, 10))).toBe('23:55Z')
  })

  it('parses meta.valid and rejects malformed payloads', () => {
    expect(parseValidTime({ meta: { valid: '2026-10-10T18:50:00Z' } })).toBe(VALID)
    expect(parseValidTime({ meta: { valid: 'not a date' } })).toBeNull()
    expect(parseValidTime({ meta: {} })).toBeNull()
    expect(parseValidTime({})).toBeNull()
    expect(parseValidTime(null)).toBeNull()
  })
})
