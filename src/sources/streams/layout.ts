import type { ChaserStream } from './curated'
import type { FeedStatus } from './resolve'

export const PRIMARY_STORAGE_KEY = 'storm-chasers.streams.primary'
export const SOUND_STORAGE_KEY = 'storm-chasers.streams.mainSound'

/** Sets the YouTube embed `mute` param. Curated embeds are muted by default (`mute=1`). */
export function withSound(embedUrl: string, soundOn: boolean): string {
  const url = new URL(embedUrl)
  url.searchParams.set('mute', soundOn ? '0' : '1')
  return url.toString()
}

export function loadMainSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMainSound(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, on ? '1' : '0')
  } catch {
    // Storage blocked: the preference simply does not persist.
  }
}

/**
 * Live AOI feeds, live elsewhere and checked-but-unknown feeds, ENDED/OFFLINE, then context feeds.
 * Stable within each tier. A feed with no status (not checked yet) keeps its AOI rank.
 */
export function sortStreams<T extends ChaserStream & { status?: FeedStatus }>(streams: T[], aoiStates: string[]): T[] {
  const tier = (s: T) => {
    if (s.context) return 3
    if (s.status === 'ended' || s.status === 'offline') return 2
    if (s.status === 'unknown') return 1
    return s.states.some((st) => aoiStates.includes(st)) ? 0 : 1
  }
  return [...streams].sort((a, b) => tier(a) - tier(b))
}

export function isInAoi(stream: ChaserStream, aoiStates: string[]): boolean {
  return stream.states.some((st) => aoiStates.includes(st))
}

/**
 * Primary is the stored id if still present and not known to be over, otherwise the first feed in
 * sorted order (live feeds sort first). A stored choice from an earlier session that has since
 * ENDED/gone OFFLINE no longer takes the main slot; the stored id is kept, so it returns if it goes live.
 */
export function layoutStreams<T extends ChaserStream & { status?: FeedStatus }>(
  sorted: T[],
  primaryId: string | null,
): { primary: T | undefined; thumbs: T[] } {
  const stored = sorted.find((s) => s.id === primaryId)
  const over = stored?.status === 'ended' || stored?.status === 'offline'
  const primary = (stored && !over ? stored : undefined) ?? sorted[0]
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
