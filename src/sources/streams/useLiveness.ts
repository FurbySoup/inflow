import { useQueries, useQueryClient } from '@tanstack/react-query'

import type { ChaserStream } from './curated'
import { checkLiveness } from './liveness'
import { mergeLiveness, resolveFeed, type FeedResolution, type LivenessResult } from './resolve'

export const LIVENESS_INTERVAL_MS = 5 * 60_000

/**
 * Liveness per feed, polled every 5 min, but only for feeds where `isActive` is true (the primary and
 * on-screen tiles). Inactive feeds send no request and keep their last result. Unknown refreshes keep the
 * previous answer (mergeLiveness). Feeds never checked are absent from the map. Panels never fetch directly.
 */
export function useLiveness(feeds: ChaserStream[], isActive: (id: string) => boolean): Map<string, FeedResolution> {
  const queryClient = useQueryClient()
  const results = useQueries({
    queries: feeds.map((feed) => {
      const queryKey = ['streams', 'liveness', feed.id]
      return {
        queryKey,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const prev = queryClient.getQueryData<LivenessResult>(queryKey)
          return mergeLiveness(prev, await checkLiveness(feed.youtube, signal))
        },
        enabled: isActive(feed.id),
        refetchInterval: LIVENESS_INTERVAL_MS,
        staleTime: LIVENESS_INTERVAL_MS,
      }
    }),
  })
  const resolved = new Map<string, FeedResolution>()
  feeds.forEach((feed, i) => {
    const data = results[i]?.data
    if (data !== undefined) resolved.set(feed.id, resolveFeed(feed.youtube, data))
  })
  return resolved
}
