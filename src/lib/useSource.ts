import { useQuery } from '@tanstack/react-query'
import type { SourceAdapter } from '../sources/types'
import { useAoi } from '../state/aoi'

/** Polls an adapter on its own cadence and returns normalized items. Panels use this, never fetch directly. */
export function useSource<Raw, Item>(adapter: SourceAdapter<Raw, Item>) {
  const bbox = useAoi((s) => s.bbox)
  return useQuery({
    queryKey: [adapter.id, bbox],
    queryFn: async ({ signal }) => adapter.normalize(await adapter.fetch(bbox, signal)),
    refetchInterval: adapter.refreshMs,
    refetchIntervalInBackground: adapter.background ?? false,
    placeholderData: (prev) => prev,
  })
}
