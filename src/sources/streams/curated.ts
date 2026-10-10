import type { LiveStream } from '../../types'
import raw from '../../../config/streams.json'

export interface StreamEntry {
  id: string
  title: string
  /** channelId embeds whatever that channel is currently streaming; videoId pins one stream. */
  youtube: { channelId: string } | { videoId: string }
  states: string[]
}

export function normalizeStreams(entries: StreamEntry[]): LiveStream[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    embedUrl:
      'videoId' in e.youtube
        ? `https://www.youtube.com/embed/${e.youtube.videoId}?autoplay=1&mute=1`
        : `https://www.youtube.com/embed/live_stream?channel=${e.youtube.channelId}&autoplay=1&mute=1`,
    states: e.states,
  }))
}

export const curatedStreams = normalizeStreams(raw as StreamEntry[])
