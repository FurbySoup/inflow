import { useQueries } from '@tanstack/react-query'

import type { ChaserStream } from './curated'
import { checkLiveness } from './liveness'
import { resolveFeed, type FeedResolution } from './resolve'

export const LIVENESS_INTERVAL_MS = 5 * 60_000

/**
 * Liveness per feed, polled every 5 min, but only for feeds where `isActive` is true (the primary and
 * on-screen tiles). Inactive feeds send no request and keep their last result. Panels never fetch directly.
 */
export function useLiveness(feeds: ChaserStream[], isActive: (id: string) => boolean): Map<string, FeedResolution> {
  const results = useQueries({
    queries: feeds.map((feed) => ({
      queryKey: ['streams', 'liveness', feed.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => checkLiveness(feed.youtube, signal),
      enabled: isActive(feed.id),
      refetchInterval: LIVENESS_INTERVAL_MS,
      staleTime: LIVENESS_INTERVAL_MS,
    })),
  })
  return new Map(feeds.map((feed, i) => [feed.id, resolveFeed(feed.youtube, results[i]?.data)]))
}
