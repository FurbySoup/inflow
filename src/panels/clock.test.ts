import { describe, expect, it } from 'vitest'
import { sameOffset, utcOffsetMinutes, zoneLabel } from './clock'

const SUMMER = new Date('2026-07-01T18:00:00Z')
const WINTER = new Date('2026-12-01T18:00:00Z')

describe('zoneLabel', () => {
  it('shows CDT in summer and CST in winter for America/Chicago', () => {
    expect(zoneLabel(SUMMER, 'America/Chicago')).toBe('13:00 CDT')
    expect(zoneLabel(WINTER, 'America/Chicago')).toBe('12:00 CST')
  })

  it('shows MST year-round for Phoenix', () => {
    expect(zoneLabel(SUMMER, 'America/Phoenix')).toBe('11:00 MST')
  })

  it('uses 00 rather than 24 at midnight', () => {
    expect(zoneLabel(new Date('2026-07-01T04:00:00Z'), 'America/New_York')).toBe('00:00 EDT')
  })
})

describe('utcOffsetMinutes', () => {
  it('moves with DST', () => {
    expect(utcOffsetMinutes(SUMMER, 'America/Chicago')).toBe(-300)
    expect(utcOffsetMinutes(WINTER, 'America/Chicago')).toBe(-360)
  })
})

describe('sameOffset', () => {
  it('is true for zones on the same offset at the instant', () => {
    expect(sameOffset(SUMMER, 'America/New_York', 'America/Toronto')).toBe(true)
    expect(sameOffset(SUMMER, 'America/Phoenix', 'America/Los_Angeles')).toBe(true)
  })

  it('is false for zones on different offsets', () => {
    expect(sameOffset(SUMMER, 'America/New_York', 'America/Chicago')).toBe(false)
    expect(sameOffset(SUMMER, 'America/Phoenix', 'America/Denver')).toBe(false)
  })
})
