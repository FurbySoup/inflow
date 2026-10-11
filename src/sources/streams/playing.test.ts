import { describe, expect, it } from 'vitest'
import { liveKind, prunePlaying, startTile, stopTile } from './playing'

describe('startTile', () => {
  it('appends the new id', () => {
    expect(startTile(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('drops the oldest past the cap of 3', () => {
    expect(startTile(['a', 'b', 'c'], 'd')).toEqual(['b', 'c', 'd'])
  })

  it('is idempotent: an id already playing is not added again', () => {
    const playing = ['a', 'b']
    expect(startTile(playing, 'a')).toBe(playing)
    expect(startTile(['a', 'b', 'c'], 'b')).toEqual(['a', 'b', 'c'])
  })

  it('honours a custom max', () => {
    expect(startTile(['a'], 'b', 1)).toEqual(['b'])
  })
})

describe('stopTile', () => {
  it('removes the id and keeps the order of the rest', () => {
    expect(stopTile(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('is a no-op for an id not playing', () => {
    const playing = ['a']
    expect(stopTile(playing, 'z')).toBe(playing)
  })
})

describe('prunePlaying', () => {
  const feeds = [
    { id: 'live', status: 'live' as const },
    { id: 'off', status: 'offline' as const },
    { id: 'ended', status: 'ended' as const },
    { id: 'primary', status: 'live' as const },
    { id: 'unchecked' },
  ]

  it('drops ids that became OFFLINE', () => {
    expect(prunePlaying(['live', 'off'], feeds)).toEqual(['live'])
  })

  it('drops the primary id', () => {
    expect(prunePlaying(['live', 'primary'], feeds, 'primary')).toEqual(['live'])
  })

  it('keeps ENDED (replay) and unchecked feeds', () => {
    expect(prunePlaying(['ended', 'unchecked'], feeds)).toEqual(['ended', 'unchecked'])
  })

  it('returns the same array when nothing is dropped', () => {
    const playing = ['live', 'ended']
    expect(prunePlaying(playing, feeds, 'primary')).toBe(playing)
  })
})

describe('liveKind', () => {
  it('is live only when confirmed live', () => {
    expect(liveKind('live', false)).toBe('live')
    expect(liveKind('live', true)).toBe('live')
  })

  it('is replay for an ended broadcast', () => {
    expect(liveKind('ended', true)).toBe('replay')
  })

  it('is replay for a pinned video whose check failed (unconfirmed)', () => {
    expect(liveKind('unknown', true)).toBe('replay')
  })

  it('is offline for an offline feed, even a pinned one', () => {
    expect(liveKind('offline', false)).toBe('offline')
    expect(liveKind('offline', true)).toBe('offline')
  })

  it('is unchecked for a feed not checked yet, pinned or not', () => {
    expect(liveKind(undefined, false)).toBe('unchecked')
    expect(liveKind(undefined, true)).toBe('unchecked')
  })

  it('is unchecked for a channel-only feed whose check failed', () => {
    expect(liveKind('unknown', false)).toBe('unchecked')
  })
})
