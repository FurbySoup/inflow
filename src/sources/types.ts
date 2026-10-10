import type { Bbox } from '../types'

/**
 * Contract every data source implements. `fetch` returns raw upstream data; `normalize`
 * is a pure function to shared types so it can be unit-tested against recorded fixtures.
 */
export interface SourceAdapter<Raw, Item> {
  id: string
  /** Poll interval in ms for TanStack Query `refetchInterval`. */
  refreshMs: number
  fetch(aoi: Bbox, signal?: AbortSignal): Promise<Raw>
  normalize(raw: Raw): Item[]
}
