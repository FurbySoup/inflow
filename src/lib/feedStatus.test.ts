import { describe, expect, it } from 'vitest'
import { formatAge, queryFeed, queryStatus, resolveFeed } from './feedStatus'

describe('formatAge', () => {
  it('uses seconds under a minute and m + two-digit seconds after', () => {
    expect(formatAge(0)).toBe('0s')
    expect(formatAge(12_999)).toBe('12s')
    expect(formatAge(59_000)).toBe('59s')
    expect(formatAge(60_000)).toBe('1m00s')
    expect(formatAge(245_000)).toBe('4m05s')
  })

  it('never goes negative', () => {
    expect(formatAge(-5_000)).toBe('0s')
  })
})

describe('queryFeed', () => {
  it('maps query state to a status and the dataUpdatedAt timestamp', () => {
    expect(queryFeed({ isPending: true, isError: false, dataUpdatedAt: 0 })).toEqual({ status: 'loading' })
    expect(queryFeed({ isPending: false, isError: true, dataUpdatedAt: 500 })).toEqual({ status: 'error', updatedAt: 500 })
    expect(queryFeed({ isPending: false, isError: false, dataUpdatedAt: 1_000 }, 60_000)).toEqual({
      status: 'live',
      updatedAt: 1_000,
      refreshMs: 60_000,
    })
  })

  it('keeps queryStatus unchanged for existing callers', () => {
    expect(queryStatus({ isPending: false, isError: false })).toBe('live')
  })
})

describe('resolveFeed', () => {
  const now = 1_000_000

  it('shows no age before the first fetch', () => {
    expect(resolveFeed({ status: 'loading' }, now)).toEqual({ status: 'loading' })
  })

  it('derives the age from updatedAt', () => {
    expect(resolveFeed({ status: 'live', updatedAt: now - 12_000 }, now)).toEqual({ status: 'live', age: '12s' })
  })

  it('marks live data stale only after 3x the refresh interval', () => {
    const feed = { status: 'live' as const, updatedAt: now - 180_000, refreshMs: 60_000 }
    expect(resolveFeed(feed, now).status).toBe('live')
    expect(resolveFeed({ ...feed, updatedAt: now - 180_001 }, now).status).toBe('stale')
  })

  it('leaves the status alone when no refreshMs is given', () => {
    expect(resolveFeed({ status: 'live', updatedAt: now - 3_600_000 }, now)).toEqual({ status: 'live', age: '60m00s' })
  })

  it('keeps error status and still reports the age of the last good data', () => {
    expect(resolveFeed({ status: 'error', updatedAt: now - 30_000, refreshMs: 10_000 }, now)).toEqual({
      status: 'error',
      age: '30s',
    })
  })
})
