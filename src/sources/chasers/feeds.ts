import type { Bbox } from '../../types'
import { applyResolution, type LiveFeed } from '../streams/resolve'
import type { Chaser } from './roster'
import type { RosterResult } from './scheduler'

export interface RosterLive {
  chaser: Chaser
  videoId: string
}

/** Roster channels confirmed live, in roster order. Offline and unknown channels never create tiles. */
export function rosterLive(chasers: readonly Chaser[], results: ReadonlyMap<string, RosterResult>): RosterLive[] {
  const live: RosterLive[] = []
  for (const chaser of chasers) {
    const r = results.get(chaser.channelId)
    if (r?.state === 'live' && r.videoId !== undefined) live.push({ chaser, videoId: r.videoId })
  }
  return live
}

/** Feed id for a roster channel. Prefixed so it can never collide with a curated id. */
export function rosterFeedId(channelId: string): string {
  return `chaser:${channelId}`
}

/** A live roster channel as a feed: the verified videoId is what plays. */
export function rosterFeed({ chaser, videoId }: RosterLive): LiveFeed {
  return {
    id: rosterFeedId(chaser.channelId),
    title: chaser.name,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`,
    states: chaser.states,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    context: false,
    youtube: { videoId, channelId: chaser.channelId },
    status: 'live',
  }
}

export interface RosterMerge {
  feeds: LiveFeed[]
  /** Feed id to the videoId the roster confirmed, for stills. */
  videoIds: Map<string, string>
}

/**
 * Curated feeds plus live roster channels, one feed per channel (de-duped by channelId). A curated entry
 * that shares a channel with a live roster result keeps its own tile; the roster only updates its status
 * (and points it at the live video when the curated pin is not live). Roster-only channels are appended.
 */
export function mergeRoster(curated: readonly LiveFeed[], live: readonly RosterLive[]): RosterMerge {
  const videoIds = new Map<string, string>()
  const byChannel = new Map(live.map((l) => [l.chaser.channelId, l]))
  const matched = new Set<string>()
  const feeds = curated.map((feed): LiveFeed => {
    const hit = feed.youtube.channelId === undefined ? undefined : byChannel.get(feed.youtube.channelId)
    if (!hit) return feed
    matched.add(hit.chaser.channelId)
    videoIds.set(feed.id, hit.videoId)
    if (feed.status === 'live') return feed
    return applyResolution(feed, { status: 'live', fallbackVideoId: hit.videoId })
  })
  for (const l of live) {
    if (matched.has(l.chaser.channelId)) continue
    feeds.push(rosterFeed(l))
    videoIds.set(rosterFeedId(l.chaser.channelId), l.videoId)
  }
  return { feeds, videoIds }
}

/**
 * Spotter Network map, centred on the AOI at zoom 7 (link-out only: their position data may not be
 * redisplayed, so no /feeds or data.xml fetches). The longitude parameter is `lon`; `lng` is ignored.
 */
export function spotterMapUrl(bbox: Bbox): string {
  const lat = (bbox.north + bbox.south) / 2
  const lon = (bbox.east + bbox.west) / 2
  return `https://www.spotternetwork.org/pages/map?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=7`
}
