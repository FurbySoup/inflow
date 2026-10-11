import { describe, expect, it } from 'vitest'
import { currentVideoId } from './resolve'
import {
  isSnapshotStale,
  snapshotAgeLabel,
  snapshotPlaceholder,
  snapshotSource,
  snapshotsDue,
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_STALE_MS,
} from './snapshot'

const T = 1_000_000

describe('snapshotSource', () => {
  it('uses hqdefault.jpg, cache-busted with the fetch time, for a live video', () => {
    expect(snapshotSource('7kQACmPd6Io', 'live', T)).toBe(`https://i.ytimg.com/vi/7kQACmPd6Io/hqdefault.jpg?t=${T}`)
  })

  it('uses the same still for an ended video', () => {
    expect(snapshotSource('Syyvt9aidlQ', 'ended', T)).toBe(`https://i.ytimg.com/vi/Syyvt9aidlQ/hqdefault.jpg?t=${T}`)
  })

  it('treats a channel with a resolved live video the same as a pinned video', () => {
    const resolved = currentVideoId({ channelId: 'UCok' }, { channel: { videoId: 'abcdefghijk' } })
    expect(snapshotSource(resolved, 'live', T)).toBe(`https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg?t=${T}`)
  })

  it('has no still for a channel whose live video is unknown', () => {
    const unknown = currentVideoId({ channelId: 'UCok' }, { channel: 'unknown' })
    expect(snapshotSource(unknown, 'unknown', T)).toBeNull()
  })

  it('has no still before the first fetch, without a video id, or for offline/unknown feeds', () => {
    expect(snapshotSource('7kQACmPd6Io', 'live', undefined)).toBeNull()
    expect(snapshotSource(undefined, 'live', T)).toBeNull()
    expect(snapshotSource('7kQACmPd6Io', 'offline', T)).toBeNull()
    expect(snapshotSource('7kQACmPd6Io', 'unknown', T)).toBeNull()
    expect(snapshotSource('7kQACmPd6Io', undefined, T)).toBeNull()
  })
})

describe('snapshotPlaceholder', () => {
  it('names the state in the copy from the handoff', () => {
    expect(snapshotPlaceholder('unknown')).toBe('◐ STALE')
    expect(snapshotPlaceholder('offline')).toBe('○ OFFLINE')
    expect(snapshotPlaceholder(undefined)).toBe('connecting…')
  })
})

describe('snapshotAgeLabel and isSnapshotStale', () => {
  it('reads THUMB ≤5m while the still was fetched within 3 min, with no ticking seconds', () => {
    expect(snapshotAgeLabel(0)).toBe('THUMB ≤5m')
    expect(snapshotAgeLabel(60_000)).toBe('THUMB ≤5m')
    expect(snapshotAgeLabel(SNAPSHOT_STALE_MS)).toBe('THUMB ≤5m')
  })

  it('reads ◐ THUMB with whole minutes once the still is older than 3 min', () => {
    expect(snapshotAgeLabel(SNAPSHOT_STALE_MS + 1)).toBe('◐ THUMB 3m')
    expect(snapshotAgeLabel(4 * 60_000 + 30_000)).toBe('◐ THUMB 4m')
  })

  it('is stale only after 3 min without a re-fetch', () => {
    expect(isSnapshotStale(SNAPSHOT_STALE_MS)).toBe(false)
    expect(isSnapshotStale(SNAPSHOT_STALE_MS + 1)).toBe(true)
  })
})

describe('snapshotsDue', () => {
  it('refreshes on-screen feeds that were never fetched', () => {
    expect(snapshotsDue(['a'], {}, T)).toEqual(['a'])
  })

  it('refreshes an on-screen feed once a full 60 s interval has passed, and not before', () => {
    expect(SNAPSHOT_INTERVAL_MS).toBe(60_000)
    expect(snapshotsDue(['a'], { a: T }, T + SNAPSHOT_INTERVAL_MS - 1)).toEqual([])
    expect(snapshotsDue(['a'], { a: T }, T + SNAPSHOT_INTERVAL_MS)).toEqual(['a'])
  })

  it('never refreshes off-screen feeds, however old their still', () => {
    expect(snapshotsDue([], { a: T }, T + 10 * SNAPSHOT_INTERVAL_MS)).toEqual([])
    expect(snapshotsDue(['b'], { a: T, b: T + SNAPSHOT_INTERVAL_MS }, T + SNAPSHOT_INTERVAL_MS)).toEqual([])
  })
})
