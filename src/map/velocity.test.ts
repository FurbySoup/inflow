import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { followAoi, siteLabel, velocityReadout } from './velocity'

describe('followAoi', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function harness() {
    let listener: (() => void) | null = null
    let removeListener: (() => void) | null = null
    const unsubscribe = vi.fn(() => {
      listener = null
    })
    const map = {
      once(_type: 'remove', fn: () => void) {
        removeListener = fn
        return this
      },
    }
    const subscribe = (fn: () => void) => {
      listener = fn
      return unsubscribe
    }
    return {
      map,
      subscribe,
      unsubscribe,
      emit: () => listener?.(),
      remove: () => removeListener?.(),
    }
  }

  it('calls onChange once after the AOI has been quiet for the delay', () => {
    const h = harness()
    const onChange = vi.fn()
    followAoi(h.map, h.subscribe, onChange, 1000)
    h.emit()
    vi.advanceTimersByTime(600)
    h.emit()
    vi.advanceTimersByTime(999)
    expect(onChange).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes and drops the pending timer when the map is removed', () => {
    const h = harness()
    const onChange = vi.fn()
    followAoi(h.map, h.subscribe, onChange, 1000)
    h.emit()
    h.remove()
    expect(h.unsubscribe).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(onChange).not.toHaveBeenCalled()
  })
})

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
