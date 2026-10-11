import { describe, expect, it } from 'vitest'
import { currentVideoId } from './resolve'
import {
  isSnapshotStale,
  snapshotAgeLabel,
  snapshotPlaceholder,
  snapshotSource,
  snapshotsDue,
  SNAPSHOT_INTERVAL_MS,
} from './snapshot'

const T = 1_000_000

describe('snapshotSource', () => {
  it('uses the live frame with the default still as fallback for a live video', () => {
    expect(snapshotSource('7kQACmPd6Io', 'live', T)).toEqual({
      src: `https://i.ytimg.com/vi/7kQACmPd6Io/hqdefault_live.jpg?t=${T}`,
      fallbackSrc: `https://i.ytimg.com/vi/7kQACmPd6Io/hqdefault.jpg?t=${T}`,
    })
  })

  it('uses the default still for an ended video', () => {
    expect(snapshotSource('Syyvt9aidlQ', 'ended', T)).toEqual({
      src: `https://i.ytimg.com/vi/Syyvt9aidlQ/hqdefault.jpg?t=${T}`,
    })
  })

  it('treats a channel with a resolved live video the same as a pinned video', () => {
    const resolved = currentVideoId({ channelId: 'UCok' }, { channel: { videoId: 'abcdefghijk' } })
    expect(snapshotSource(resolved, 'live', T)?.src).toBe(`https://i.ytimg.com/vi/abcdefghijk/hqdefault_live.jpg?t=${T}`)
  })

  it('has no still for a channel whose live video is unknown', () => {
    const unknown = currentVideoId({ channelId: 'UCok' }, { channel: 'unknown' })
    expect(snapshotSource(unknown, 'unknown', T)).toBeNull()
  })

  it('has no still before the first refresh, without a video id, or for offline/unknown feeds', () => {
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
  it('shows whole seconds, then minutes after two minutes', () => {
    expect(snapshotAgeLabel(0)).toBe('SNAP 0s')
    expect(snapshotAgeLabel(12_900)).toBe('SNAP 12s')
    expect(snapshotAgeLabel(119_000)).toBe('SNAP 119s')
    expect(snapshotAgeLabel(125_000)).toBe('SNAP 2m')
  })

  it('turns sand only after 60 s', () => {
    expect(isSnapshotStale(60_000)).toBe(false)
    expect(isSnapshotStale(60_001)).toBe(true)
  })
})

describe('snapshotsDue', () => {
  it('refreshes on-screen feeds that were never stamped', () => {
    expect(snapshotsDue(['a'], {}, T)).toEqual(['a'])
  })

  it('refreshes an on-screen feed once a full interval has passed, and not before', () => {
    expect(snapshotsDue(['a'], { a: T }, T + SNAPSHOT_INTERVAL_MS - 1)).toEqual([])
    expect(snapshotsDue(['a'], { a: T }, T + SNAPSHOT_INTERVAL_MS)).toEqual(['a'])
  })

  it('never refreshes off-screen feeds, however old their still', () => {
    expect(snapshotsDue([], { a: T }, T + 10 * SNAPSHOT_INTERVAL_MS)).toEqual([])
    expect(snapshotsDue(['b'], { a: T, b: T + SNAPSHOT_INTERVAL_MS }, T + SNAPSHOT_INTERVAL_MS)).toEqual([])
  })
})
