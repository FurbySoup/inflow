import type { LiveStream } from '../../types'
import raw from '../../../config/streams.json'

export interface StreamEntry {
  id: string
  title: string
  /** channelId embeds whatever that channel is currently streaming; videoId pins one stream. */
  youtube: { channelId: string } | { videoId: string }
  states: string[]
  /** Ambient feed (e.g. NASA ISS Earth view): always sorted last and badged CTX. */
  context?: boolean
}

/** LiveStream plus fields the streams grid needs; derived locally so shared types stay untouched. */
export interface ChaserStream extends LiveStream {
  /** Public YouTube page opened by the link-out, not the iframe. */
  watchUrl: string
  context: boolean
}

export function watchUrl(youtube: StreamEntry['youtube']): string {
  return 'videoId' in youtube
    ? `https://www.youtube.com/watch?v=${youtube.videoId}`
    : `https://www.youtube.com/channel/${youtube.channelId}/live`
}

export function normalizeStreams(entries: StreamEntry[]): ChaserStream[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    embedUrl:
      'videoId' in e.youtube
        ? `https://www.youtube.com/embed/${e.youtube.videoId}?autoplay=1&mute=1`
        : `https://www.youtube.com/embed/live_stream?channel=${e.youtube.channelId}&autoplay=1&mute=1`,
    states: e.states,
    watchUrl: watchUrl(e.youtube),
    context: e.context === true,
  }))
}

export const curatedStreams = normalizeStreams(raw as StreamEntry[])
