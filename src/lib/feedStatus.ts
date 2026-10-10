import type { FeedStatus } from '../ui'

export type { FeedStatus }

/** Maps TanStack Query state to a panel status light. */
export function queryStatus(q: { isPending: boolean; isError: boolean }): FeedStatus {
  if (q.isPending) return 'loading'
  if (q.isError) return 'error'
  return 'live'
}
