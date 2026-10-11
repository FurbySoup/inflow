import type { Bbox } from '../types'

/**
 * Contract every data source implements. `fetch` returns raw upstream data; `normalize`
 * is a pure function to shared types so it can be unit-tested against recorded fixtures.
 */
export interface SourceAdapter<Raw, Item> {
  id: string
  /** Poll interval in ms for TanStack Query `refetchInterval`. */
  refreshMs: number
  /** Keep polling while the tab is hidden (TanStack `refetchIntervalInBackground`). Default false; notification sources set it. */
  background?: boolean
  fetch(aoi: Bbox, signal?: AbortSignal): Promise<Raw>
  normalize(raw: Raw): Item[]
}
