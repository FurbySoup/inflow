import { describe, expect, it } from 'vitest'
import { siteLabel, velocityReadout } from './velocity'

const NOW = Date.parse('2026-10-11T15:40:00Z')

describe('velocityReadout', () => {
  it('shows the ICAO id and the scan time in UTC', () => {
    expect(velocityReadout({ label: 'KFFC', valid: '2026-10-11T15:32:36Z', linkUrl: null }, NOW)).toEqual({
      label: 'SRV · KFFC',
      time: '15:32Z',
      stale: false,
    })
  })

  it('marks a scan older than 20 minutes as stale', () => {
    const r = velocityReadout({ label: 'KTLX', valid: '2026-10-11T15:19:00Z', linkUrl: null }, NOW)
    expect(r.stale).toBe(true)
    expect(r.time).toBe('15:19Z')
  })

  it('shows placeholders before the site and the scan time are known', () => {
    expect(velocityReadout({ label: null, valid: null, linkUrl: null }, NOW)).toEqual({
      label: 'SRV · ---',
      time: '--:--Z',
      stale: false,
    })
    expect(velocityReadout({ label: 'KFFC', valid: null, linkUrl: null }, NOW).time).toBe('--:--Z')
  })
})

describe('siteLabel', () => {
  it('prefixes lower-48 ids with K and leaves others as IEM ids', () => {
    expect(siteLabel({ sid: 'FFC', name: 'Atlanta', location: [-84.566, 33.363], lower48: true })).toBe('KFFC')
    expect(siteLabel({ sid: 'ABC', name: 'Bethel', location: [-161.87, 60.78], lower48: false })).toBe('ABC')
  })
})
