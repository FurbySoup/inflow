import type { FeedStatus } from './resolve'

/** Live-kind label for a tile: confirmed live, a recording (ended or pinned past video), offline, or not checked. */
export type LiveKind = 'live' | 'replay' | 'offline' | 'unchecked'

/**
 * Appends `id` as the newest playing tile. There is no cap (ADR-0017, amended 2026-10-11): a started tile plays
 * until the user stops it. Already playing: returns the same array. The input array is never mutated.
 */
export function startTile(playing: string[], id: string): string[] {
  return playing.includes(id) ? playing : [...playing, id]
}

/** Removes `id` from the playing set. Not playing: returns the same array. */
export function stopTile(playing: string[], id: string): string[] {
  return playing.includes(id) ? playing.filter((p) => p !== id) : playing
}

/**
 * Drops playing ids whose feed is now OFFLINE, is the primary, or no longer exists. Returns the same
 * array when nothing is dropped, so callers can compare by reference before updating state.
 */
export function prunePlaying(
  playing: string[],
  feeds: ReadonlyArray<{ id: string; status?: FeedStatus }>,
  primaryId: string | null = null,
): string[] {
  const keep = (id: string) => {
    if (id === primaryId) return false
    const feed = feeds.find((f) => f.id === id)
    return feed !== undefined && feed.status !== 'offline'
  }
  const next = playing.filter(keep)
  return next.length === playing.length ? playing : next
}

/**
 * Live-kind of a feed. `live` only when confirmed live. OFFLINE is never replay, so it can't be started.
 * An ENDED feed, or a pinned video whose check failed (unconfirmed), plays as a recording (`replay`).
 * Not checked yet (`undefined`), or a channel-only feed whose check failed, is `unchecked` (ADR-0017).
 */
export function liveKind(status: FeedStatus | undefined, pinnedVideo: boolean): LiveKind {
  if (status === 'live') return 'live'
  if (status === 'offline') return 'offline'
  if (status === 'ended') return 'replay'
  if (status === 'unknown' && pinnedVideo) return 'replay'
  return 'unchecked'
}
