import type { FeedStatus } from './resolve'

// Verified 2026-10-11 on a live video (11Alive, isLiveNow:true): hqdefault_live.jpg and hqdefault.jpg
// return byte-identical images, both send Cache-Control: public, max-age=300, and ?t= returns the same
// bytes. YouTube refreshes a live thumbnail at most about every 5 min, so stills are re-fetched every
// 60 s to catch each update within a minute, and the label never claims a fresher frame than that.

/** Stills are re-fetched this often while on screen. */
export const SNAPSHOT_INTERVAL_MS = 60_000
/** A still not re-fetched for longer than this (e.g. scrolled off screen) is stale: sand label, ◐ prefix. */
export const SNAPSHOT_STALE_MS = 3 * 60_000

/**
 * YouTube still for a video, cache-busted with the fetch time. Only live and ended feeds get a still;
 * anything else gets a placeholder (see snapshotPlaceholder).
 */
export function snapshotSource(
  videoId: string | undefined,
  status: FeedStatus | undefined,
  refreshedAt: number | undefined,
): string | null {
  if (!videoId || refreshedAt === undefined) return null
  if (status !== 'live' && status !== 'ended') return null
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg?t=${refreshedAt}`
}

/** Copy shown in place of a still (HANDOFF §9.10 placeholders). */
export function snapshotPlaceholder(status: FeedStatus | undefined): string {
  if (status === 'unknown') return '◐ STALE'
  if (status === 'offline') return '○ OFFLINE'
  if (status === 'ended') return '○ ENDED'
  // Live but no resolved video id (e.g. a channel whose embed names no video): no still exists, so don't promise one.
  if (status === 'live') return '◐ NO STILL'
  return 'connecting…'
}

/**
 * Read-only age label. It measures time since we fetched the still, not the age of the frame: fresh
 * stills read `THUMB ≤5m` (YouTube's own refresh ceiling); older ones read `◐ THUMB 4m`.
 */
export function snapshotAgeLabel(ageMs: number): string {
  if (!isSnapshotStale(ageMs)) return 'THUMB ≤5m'
  return `◐ THUMB ${Math.floor(ageMs / 60_000)}m`
}

export function isSnapshotStale(ageMs: number): boolean {
  return ageMs > SNAPSHOT_STALE_MS
}

/** On-screen feeds whose still has never been fetched or is at least one interval old. Off-screen feeds are never due. */
export function snapshotsDue(
  onScreen: Iterable<string>,
  refreshedAt: Readonly<Record<string, number>>,
  now: number,
): string[] {
  const due: string[] = []
  for (const id of onScreen) {
    const at = refreshedAt[id]
    if (at === undefined || now - at >= SNAPSHOT_INTERVAL_MS) due.push(id)
  }
  return due
}
