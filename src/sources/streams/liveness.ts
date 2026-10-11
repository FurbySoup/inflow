// Keyless liveness via YouTube page HTML through the dev proxy (ADR-0013). Local only: v2 uses the Data API.
import type { YoutubeRef } from './curated'
import type { LivenessResult } from './resolve'

export type WatchState = 'live' | 'ended' | 'removed' | 'unknown'
export type ChannelState = { videoId: string } | 'offline' | 'unknown'

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/** Classifies a `/watch?v=` page. Upcoming (no endTimestamp yet) and unrecognised pages are `unknown`. */
export function parseWatchPage(html: string): WatchState {
  if (html.includes('"playabilityStatus":{"status":"ERROR"')) return 'removed'
  const details = /"liveBroadcastDetails":\{([^}]*)\}/.exec(html)?.[1]
  if (details === undefined) return 'unknown'
  if (details.includes('"isLiveNow":true')) return 'live'
  if (details.includes('"isLiveNow":false') && details.includes('"endTimestamp":"')) return 'ended'
  return 'unknown'
}

/** Reads `/embed/live_stream?channel=` HTML: the channel's current video, `offline`, or `unknown`. */
export function parseLiveStreamEmbed(html: string): ChannelState {
  // The first value that is either the offline marker or a well-formed id decides; other "video_id" keys are skipped.
  for (const match of html.matchAll(/"video_id":"([^"]*)"/g)) {
    const id = match[1] ?? ''
    if (id === 'live_stream') return 'offline'
    if (VIDEO_ID.test(id)) return { videoId: id }
  }
  return 'unknown'
}

const BASE = '/api/youtube'

/** Network failures and non-200s degrade to `unknown` (the tile behaves as before). Aborts still propagate. */
async function getText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal })
    return res.ok ? await res.text() : null
  } catch (err) {
    if (signal?.aborted) throw err
    return null
  }
}

export async function fetchWatchState(videoId: string, signal?: AbortSignal): Promise<WatchState> {
  const html = await getText(`${BASE}/watch?v=${encodeURIComponent(videoId)}`, signal)
  return html === null ? 'unknown' : parseWatchPage(html)
}

export async function fetchChannelState(channelId: string, signal?: AbortSignal): Promise<ChannelState> {
  const html = await getText(`${BASE}/embed/live_stream?channel=${encodeURIComponent(channelId)}`, signal)
  return html === null ? 'unknown' : parseLiveStreamEmbed(html)
}

/** Checks only what the resolution needs: the channel is fetched only when a pin has ended or the entry is channel-only. */
export async function checkLiveness(youtube: YoutubeRef, signal?: AbortSignal): Promise<LivenessResult> {
  if (!('videoId' in youtube)) {
    return { channel: await fetchChannelState(youtube.channelId, signal) }
  }
  const watch = await fetchWatchState(youtube.videoId, signal)
  const pinEnded = watch === 'ended' || watch === 'removed'
  if (!youtube.channelId || !pinEnded) return { watch }
  return { watch, channel: await fetchChannelState(youtube.channelId, signal) }
}
