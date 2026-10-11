import type { ChannelState, WatchState } from './liveness'
import type { ChaserStream, YoutubeRef } from './curated'

export type FeedStatus = 'live' | 'ended' | 'offline' | 'unknown'

/** What the liveness checks found for one entry. Missing parts were not checked. */
export interface LivenessResult {
  watch?: WatchState
  channel?: ChannelState
}

export interface FeedResolution {
  status: FeedStatus
  /** Set when a pinned video has ended and its channel is live on another video. */
  fallbackVideoId?: string
}

export type LiveFeed = ChaserStream & { status: FeedStatus }

/**
 * Resolution table (ADR-0013):
 * - pinned live → live, as configured;
 * - pinned ended/removed + channelId → the channel's current video if live, else OFFLINE;
 *   a channel check that failed leaves ENDED, since the pin is known to be over;
 * - pinned ended/removed without channelId → ENDED;
 * - channel-only → live or OFFLINE; a failed check stays unknown (embedded as configured, no badge).
 */
export function resolveFeed(youtube: YoutubeRef, result: LivenessResult | undefined): FeedResolution {
  if (!result) return { status: 'unknown' }
  if ('videoId' in youtube) {
    const { watch, channel } = result
    if (watch === 'live') return { status: 'live' }
    if (watch !== 'ended' && watch !== 'removed') return { status: 'unknown' }
    if (!youtube.channelId || channel === undefined || channel === 'unknown') return { status: 'ended' }
    if (channel === 'offline') return { status: 'offline' }
    return { status: 'live', fallbackVideoId: channel.videoId }
  }
  if (result.channel === 'offline') return { status: 'offline' }
  if (result.channel === undefined || result.channel === 'unknown') return { status: 'unknown' }
  return { status: 'live' }
}

/** Applies a resolution: a fallback swaps the embed and link-out to the channel's current video. */
export function applyResolution(stream: ChaserStream, resolution: FeedResolution): LiveFeed {
  const fallback = resolution.fallbackVideoId
  if (fallback === undefined) return { ...stream, status: resolution.status }
  return {
    ...stream,
    status: resolution.status,
    embedUrl: `https://www.youtube.com/embed/${fallback}?autoplay=1&mute=1`,
    watchUrl: `https://www.youtube.com/watch?v=${fallback}`,
  }
}

/** Adds or removes `autoplay=1`. Off-screen feeds drop it so they stay paused and do not decode. */
export function withAutoplay(embedUrl: string, on: boolean): string {
  const url = new URL(embedUrl)
  if (on) url.searchParams.set('autoplay', '1')
  else url.searchParams.delete('autoplay')
  return url.toString()
}
