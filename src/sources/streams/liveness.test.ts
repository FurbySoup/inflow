import { afterEach, describe, expect, it, vi } from 'vitest'
import endedHtml from './fixtures/watch-ended.html?raw'
import liveHtml from './fixtures/watch-live.html?raw'
import removedHtml from './fixtures/watch-removed.html?raw'
import embedOfflineHtml from './fixtures/embed-offline.html?raw'
import embedLiveHtml from './fixtures/embed-live.html?raw'
import { checkLiveness, parseLiveStreamEmbed, parseWatchPage } from './liveness'

describe('parseWatchPage', () => {
  it('reads an ended broadcast (real fixture)', () => {
    expect(parseWatchPage(endedHtml)).toBe('ended')
  })

  it('reads a live broadcast (synthetic fixture, see its header)', () => {
    expect(parseWatchPage(liveHtml)).toBe('live')
  })

  it('reads a removed video from its ERROR playability block', () => {
    expect(parseWatchPage(removedHtml)).toBe('removed')
  })

  it('treats an upcoming stream (no endTimestamp yet) and an empty page as unknown', () => {
    const upcoming = '"liveBroadcastDetails":{"isLiveNow":false,"startTimestamp":"2026-10-11T01:00:00+00:00"}'
    expect(parseWatchPage(upcoming)).toBe('unknown')
    expect(parseWatchPage('<html></html>')).toBe('unknown')
  })
})

describe('parseLiveStreamEmbed', () => {
  it('reads the literal live_stream marker as offline (real fixture)', () => {
    expect(parseLiveStreamEmbed(embedOfflineHtml)).toBe('offline')
  })

  it('reads the current video id when live (synthetic fixture, see its header)', () => {
    expect(parseLiveStreamEmbed(embedLiveHtml)).toEqual({ videoId: '6nTCsMwGwoY' })
  })

  it('returns unknown without the marker or with a malformed id', () => {
    expect(parseLiveStreamEmbed('<html></html>')).toBe('unknown')
    expect(parseLiveStreamEmbed('"video_id":"not an id"')).toBe('unknown')
  })
})

describe('checkLiveness', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Serves fixture pages by proxy path; anything else is a 404. */
  function stubProxy(pages: Record<string, string>) {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        const body = pages[url]
        return body === undefined ? new Response('', { status: 404 }) : new Response(body, { status: 200 })
      }),
    )
    return calls
  }

  const watch = '/api/youtube/watch?v=Syyvt9aidlQ'
  const channel = '/api/youtube/embed/live_stream?channel=UCPqLI_AohMn1jnFg8ocMyHA'

  it('checks the channel only for a pinned video that has ended', async () => {
    const calls = stubProxy({ [watch]: endedHtml, [channel]: embedLiveHtml })
    const result = await checkLiveness({ videoId: 'Syyvt9aidlQ', channelId: 'UCPqLI_AohMn1jnFg8ocMyHA' })
    expect(result).toEqual({ watch: 'ended', channel: { videoId: '6nTCsMwGwoY' } })
    expect(calls).toEqual([watch, channel])
  })

  it('skips the channel request while the pin is live or has no channelId', async () => {
    const calls = stubProxy({
      '/api/youtube/watch?v=7kQACmPd6Io': liveHtml,
      '/api/youtube/watch?v=Syyvt9aidlQ': liveHtml,
    })
    expect(await checkLiveness({ videoId: '7kQACmPd6Io', channelId: 'UCZSDkxJS7PRw9V0_Sm6U7jg' })).toEqual({ watch: 'live' })
    expect(await checkLiveness({ videoId: 'Syyvt9aidlQ' })).toEqual({ watch: 'live' })
    expect(calls).toEqual(['/api/youtube/watch?v=7kQACmPd6Io', '/api/youtube/watch?v=Syyvt9aidlQ'])
  })

  it('channel-only entries check the channel live_stream embed', async () => {
    const calls = stubProxy({ [channel]: embedOfflineHtml })
    expect(await checkLiveness({ channelId: 'UCPqLI_AohMn1jnFg8ocMyHA' })).toEqual({ channel: 'offline' })
    expect(calls).toEqual([channel])
  })

  it('degrades a failed or non-200 response to unknown', async () => {
    stubProxy({})
    expect(await checkLiveness({ videoId: 'AAAAAAAAAAA' })).toEqual({ watch: 'unknown' })
  })
})
