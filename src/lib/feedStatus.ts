import type { FeedStatus } from '../ui'

export type { FeedStatus }

/** A feed snapshot for the panel header: its status, plus when the data last arrived so the header can show its age. */
export interface FeedState {
  status: FeedStatus
  /** Epoch ms of the last successful fetch (TanStack `dataUpdatedAt`). Absent before the first one. */
  updatedAt?: number
  /** The source's poll interval. When set, a live feed older than 3× this interval shows as stale. */
  refreshMs?: number
}

/** Data older than this many refresh intervals is stale (INFLOW §9 item 10). */
export const STALE_INTERVALS = 3

/** Maps TanStack Query state to a panel status light. */
export function queryStatus(q: { isPending: boolean; isError: boolean }): FeedStatus {
  if (q.isPending) return 'loading'
  if (q.isError) return 'error'
  return 'live'
}

/** Maps a TanStack Query to a FeedState. Pass the adapter's `refreshMs` to enable the stale rule. */
export function queryFeed(
  q: { isPending: boolean; isError: boolean; dataUpdatedAt: number },
  refreshMs?: number,
): FeedState {
  const feed: FeedState = { status: queryStatus(q) }
  if (q.dataUpdatedAt > 0) feed.updatedAt = q.dataUpdatedAt
  if (refreshMs !== undefined) feed.refreshMs = refreshMs
  return feed
}

/** `12s` under a minute, then `4m05s`. Negative input reads as 0s. */
export function formatAge(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60)
  return mm === 0 ? `${ss}s` : `${mm}m${String(ss).padStart(2, '0')}s`
}

/** Resolves a FeedState at time `now`: applies the stale rule and formats the age (undefined before the first fetch). */
export function resolveFeed(feed: FeedState, now: number): { status: FeedStatus; age?: string } {
  if (feed.updatedAt === undefined) return { status: feed.status }
  const ageMs = Math.max(0, now - feed.updatedAt)
  const stale = feed.status === 'live' && feed.refreshMs !== undefined && ageMs > STALE_INTERVALS * feed.refreshMs
  return { status: stale ? 'stale' : feed.status, age: formatAge(ageMs) }
}
