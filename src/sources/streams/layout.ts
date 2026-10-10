import type { ChaserStream } from './curated'

export const PRIMARY_STORAGE_KEY = 'storm-chasers.streams.primary'

/** AOI-relevant feeds first, other chasers next, context feeds last. Stable within each tier. */
export function sortStreams(streams: ChaserStream[], aoiStates: string[]): ChaserStream[] {
  const tier = (s: ChaserStream) =>
    s.context ? 2 : s.states.some((st) => aoiStates.includes(st)) ? 0 : 1
  return [...streams].sort((a, b) => tier(a) - tier(b))
}

export function isInAoi(stream: ChaserStream, aoiStates: string[]): boolean {
  return stream.states.some((st) => aoiStates.includes(st))
}

/** Primary is the stored id if still present, otherwise the first feed in sorted order. */
export function layoutStreams(
  sorted: ChaserStream[],
  primaryId: string | null,
): { primary: ChaserStream | undefined; thumbs: ChaserStream[] } {
  const primary = sorted.find((s) => s.id === primaryId) ?? sorted[0]
  return { primary, thumbs: sorted.filter((s) => s !== primary) }
}

export function loadPrimaryId(): string | null {
  try {
    return window.localStorage.getItem(PRIMARY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function savePrimaryId(id: string): void {
  try {
    window.localStorage.setItem(PRIMARY_STORAGE_KEY, id)
  } catch {
    // Storage blocked or full: the selection simply does not persist.
  }
}
