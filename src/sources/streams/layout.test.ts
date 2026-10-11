import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeStreams } from './curated'
import {
  PRIMARY_STORAGE_KEY,
  layoutStreams,
  loadPrimaryId,
  savePrimaryId,
  sortStreams,
  withSound,
} from './layout'

describe('withSound', () => {
  const muted = 'https://www.youtube.com/embed/abc?autoplay=1&mute=1'

  it('unmutes and re-mutes while keeping other params', () => {
    const on = withSound(muted, true)
    expect(new URL(on).searchParams.get('mute')).toBe('0')
    expect(new URL(on).searchParams.get('autoplay')).toBe('1')
    expect(new URL(withSound(on, false)).searchParams.get('mute')).toBe('1')
  })

  it('works for channel live_stream embeds', () => {
    const url = withSound('https://www.youtube.com/embed/live_stream?channel=UC1&autoplay=1&mute=1', true)
    expect(new URL(url).searchParams.get('channel')).toBe('UC1')
    expect(new URL(url).searchParams.get('mute')).toBe('0')
  })
})

const fixtures = normalizeStreams([
  { id: 'ctx', title: 'ISS', youtube: { channelId: 'UCiss' }, states: [], context: true },
  { id: 'ok', title: 'OK chaser', youtube: { channelId: 'UCok' }, states: ['OK'] },
  { id: 'ga', title: 'GA pinned', youtube: { videoId: 'vGA' }, states: ['GA', 'SC'] },
  { id: 'tx', title: 'TX chaser', youtube: { channelId: 'UCtx' }, states: ['TX'] },
  { id: 'sc', title: 'SC chaser', youtube: { channelId: 'UCsc' }, states: ['SC'] },
])

describe('sortStreams', () => {
  it('puts AOI-relevant feeds first and context feeds last', () => {
    const ids = sortStreams(fixtures, ['GA', 'SC']).map((s) => s.id)
    expect(ids).toEqual(['ga', 'sc', 'ok', 'tx', 'ctx'])
  })

  it('keeps a context feed last even when its states match the AOI', () => {
    const withCtxInAoi = normalizeStreams([
      { id: 'ctx', title: 'C', youtube: { channelId: 'UCc' }, states: ['GA'], context: true },
      { id: 'ok', title: 'O', youtube: { channelId: 'UCo' }, states: ['OK'] },
    ])
    expect(sortStreams(withCtxInAoi, ['GA']).map((s) => s.id)).toEqual(['ok', 'ctx'])
  })

  it('does not mutate its input', () => {
    const before = fixtures.map((s) => s.id)
    sortStreams(fixtures, ['TX'])
    expect(fixtures.map((s) => s.id)).toEqual(before)
  })
})

describe('sortStreams with liveness', () => {
  it('ranks live AOI, live elsewhere, ENDED/OFFLINE, then context', () => {
    const feeds = [
      { ...fixtures[0]!, id: 'ctx', status: 'live' as const },
      { ...fixtures[1]!, id: 'ok-off', status: 'offline' as const },
      { ...fixtures[2]!, id: 'ga-ended', status: 'ended' as const },
      { ...fixtures[3]!, id: 'tx-live', status: 'live' as const },
      { ...fixtures[4]!, id: 'sc-live', status: 'live' as const },
    ]
    expect(sortStreams(feeds, ['GA', 'SC']).map((s) => s.id)).toEqual([
      'sc-live',
      'tx-live',
      'ok-off',
      'ga-ended',
      'ctx',
    ])
  })

  it('keeps an unchecked AOI feed in the AOI tier', () => {
    const feeds = [
      { ...fixtures[1]!, id: 'ok-unknown', status: 'unknown' as const },
      { ...fixtures[2]!, id: 'ga-unchecked' },
    ]
    expect(sortStreams(feeds, ['GA']).map((s) => s.id)).toEqual(['ga-unchecked', 'ok-unknown'])
  })

  it('ranks a checked-but-unknown AOI feed below live AOI feeds, with live elsewhere', () => {
    const feeds = [
      { ...fixtures[1]!, id: 'ok-live', status: 'live' as const },
      { ...fixtures[2]!, id: 'ga-unknown', status: 'unknown' as const },
      { ...fixtures[2]!, id: 'ga-live', status: 'live' as const },
    ]
    expect(sortStreams(feeds, ['GA']).map((s) => s.id)).toEqual(['ga-live', 'ok-live', 'ga-unknown'])
  })
})

describe('layoutStreams', () => {
  const sorted = sortStreams(fixtures, ['GA', 'SC'])

  it('splits a multi-stream fixture into primary and thumbnails', () => {
    const { primary, thumbs } = layoutStreams(sorted, 'tx')
    expect(primary?.id).toBe('tx')
    expect(thumbs.map((s) => s.id)).toEqual(['ga', 'sc', 'ok', 'ctx'])
  })

  it('falls back to the first sorted feed when no id is stored or it is unknown', () => {
    expect(layoutStreams(sorted, null).primary?.id).toBe('ga')
    expect(layoutStreams(sorted, 'removed-feed').primary?.id).toBe('ga')
    expect(layoutStreams(sorted, 'removed-feed').thumbs).toHaveLength(4)
  })

  it('handles an empty list', () => {
    expect(layoutStreams([], 'x')).toEqual({ primary: undefined, thumbs: [] })
  })

  it("ignores a stored primary that is known to be over (yesterday's ended broadcast)", () => {
    const withStatus = sorted.map((s) => (s.id === 'tx' ? { ...s, status: 'ended' as const } : s))
    expect(layoutStreams(withStatus, 'tx').primary?.id).toBe('ga')
    const offline = sorted.map((s) => (s.id === 'tx' ? { ...s, status: 'offline' as const } : s))
    expect(layoutStreams(offline, 'tx').primary?.id).toBe('ga')
  })

  it('keeps a stored primary that is live or not checked yet', () => {
    const live = sorted.map((s) => (s.id === 'tx' ? { ...s, status: 'live' as const } : s))
    expect(layoutStreams(live, 'tx').primary?.id).toBe('tx')
    expect(layoutStreams(sorted, 'tx').primary?.id).toBe('tx')
  })
})

describe('primary persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('round-trips the primary id through localStorage', () => {
    savePrimaryId('sc')
    expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe('sc')
    expect(loadPrimaryId()).toBe('sc')
  })

  it('returns null and does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadPrimaryId()).toBeNull()
    expect(() => savePrimaryId('sc')).not.toThrow()
  })
})
