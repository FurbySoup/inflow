import type { FeedStatus } from './resolve'

/** Thumbnails are stills, re-fetched this often while on screen (HANDOFF §9.10). */
export const SNAPSHOT_INTERVAL_MS = 15_000
/** A still older than this shows its SNAP age in sand. */
export const SNAPSHOT_STALE_MS = 60_000

export interface SnapshotSource {
  src: string
  /** Tried once if `src` fails to load (live thumbs fall back to the default still). */
  fallbackSrc?: string
}

/**
 * YouTube still for a video, cache-busted with the refresh time. Checked 2026-10-11: for ended videos
 * `hqdefault_live.jpg` returns the same bytes as `hqdefault.jpg`, so either path is safe for those. A live
 * stream is expected to serve its live frame at `hqdefault_live.jpg` (not checkable while none is live).
 * Only live and ended feeds get a still; anything else gets a placeholder (see snapshotPlaceholder).
 */
export function snapshotSource(
  videoId: string | undefined,
  status: FeedStatus | undefined,
  refreshedAt: number | undefined,
): SnapshotSource | null {
  if (!videoId || refreshedAt === undefined) return null
  if (status !== 'live' && status !== 'ended') return null
  const base = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/`
  const cacheBust = `?t=${refreshedAt}`
  if (status === 'ended') return { src: `${base}hqdefault.jpg${cacheBust}` }
  return { src: `${base}hqdefault_live.jpg${cacheBust}`, fallbackSrc: `${base}hqdefault.jpg${cacheBust}` }
}

/** Copy shown in place of a still (HANDOFF §9.10 placeholders). */
export function snapshotPlaceholder(status: FeedStatus | undefined): string {
  if (status === 'unknown') return '◐ STALE'
  if (status === 'offline') return '○ OFFLINE'
  if (status === 'ended') return '○ ENDED'
  return 'connecting…'
}

/** `SNAP 12s`, then whole minutes once it passes two minutes. */
export function snapshotAgeLabel(ageMs: number): string {
  const seconds = Math.max(0, Math.floor(ageMs / 1000))
  return seconds < 120 ? `SNAP ${seconds}s` : `SNAP ${Math.floor(seconds / 60)}m`
}

export function isSnapshotStale(ageMs: number): boolean {
  return ageMs > SNAPSHOT_STALE_MS
}

/** Feeds on screen whose still has never been taken or is at least one interval old. Off-screen feeds are never due. */
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
