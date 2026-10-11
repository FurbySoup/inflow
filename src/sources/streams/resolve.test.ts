import { describe, expect, it } from 'vitest'
import { normalizeStreams } from './curated'
import { applyResolution, mergeLiveness, resolveFeed, withAutoplay } from './resolve'

const pinnedWithChannel = { videoId: 'Syyvt9aidlQ', channelId: 'UCPqLI_AohMn1jnFg8ocMyHA' }
const pinnedOnly = { videoId: 'vGA' }
const channelOnly = { channelId: 'UCok' }

describe('resolveFeed', () => {
  it('leaves a pinned live video as configured', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'live' })).toEqual({ status: 'live' })
  })

  it('falls back to the channel current video when the pin ended', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'ended', channel: { videoId: '6nTCsMwGwoY' } })).toEqual({
      status: 'live',
      fallbackVideoId: '6nTCsMwGwoY',
    })
  })

  it('falls back for a removed pin too', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'removed', channel: { videoId: 'abcdefghijk' } })).toEqual({
      status: 'live',
      fallbackVideoId: 'abcdefghijk',
    })
  })

  it('shows OFFLINE when the pin ended and the channel is offline', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'ended', channel: 'offline' })).toEqual({ status: 'offline' })
  })

  it('shows ENDED when the pin ended and the channel check failed', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'ended', channel: 'unknown' })).toEqual({ status: 'ended' })
    expect(resolveFeed(pinnedWithChannel, { watch: 'ended' })).toEqual({ status: 'ended' })
  })

  it('shows ENDED for an ended pin without a channelId, without asking the channel', () => {
    expect(resolveFeed(pinnedOnly, { watch: 'ended' })).toEqual({ status: 'ended' })
    expect(resolveFeed(pinnedOnly, { watch: 'removed' })).toEqual({ status: 'ended' })
  })

  it('keeps an unparseable watch page unknown, with no badge', () => {
    expect(resolveFeed(pinnedWithChannel, { watch: 'unknown' })).toEqual({ status: 'unknown' })
  })

  it('maps channel-only feeds to live or OFFLINE, and unknown when the check fails', () => {
    expect(resolveFeed(channelOnly, { channel: { videoId: 'abcdefghijk' } })).toEqual({ status: 'live' })
    expect(resolveFeed(channelOnly, { channel: 'offline' })).toEqual({ status: 'offline' })
    expect(resolveFeed(channelOnly, { channel: 'unknown' })).toEqual({ status: 'unknown' })
  })

  it('is unknown before any check has run', () => {
    expect(resolveFeed(pinnedWithChannel, undefined)).toEqual({ status: 'unknown' })
    expect(resolveFeed(channelOnly, undefined)).toEqual({ status: 'unknown' })
  })
})

describe('mergeLiveness', () => {
  const fallback = { videoId: '6nTCsMwGwoY' }

  it('starts from the first result', () => {
    expect(mergeLiveness(undefined, { watch: 'ended', channel: fallback })).toEqual({ watch: 'ended', channel: fallback })
  })

  it('keeps a fallback when one refresh fails transiently', () => {
    const merged = mergeLiveness(
      { watch: 'ended', channel: fallback },
      { watch: 'unknown' },
    )
    expect(resolveFeed(pinnedWithChannel, merged)).toEqual({ status: 'live', fallbackVideoId: '6nTCsMwGwoY' })
  })

  it('keeps the previous channel answer when only the channel check fails', () => {
    expect(mergeLiveness({ watch: 'ended', channel: 'offline' }, { watch: 'ended', channel: 'unknown' })).toEqual({
      watch: 'ended',
      channel: 'offline',
    })
  })

  it('takes fresh known answers over the previous ones', () => {
    expect(mergeLiveness({ watch: 'ended', channel: fallback }, { watch: 'live' })).toEqual({ watch: 'live', channel: fallback })
    expect(mergeLiveness({ watch: 'ended', channel: fallback }, { watch: 'ended', channel: 'offline' })).toEqual({
      watch: 'ended',
      channel: 'offline',
    })
  })

  it('does not invent an answer when there was none before', () => {
    expect(mergeLiveness({ watch: 'unknown' }, { watch: 'unknown' })).toEqual({ watch: 'unknown', channel: undefined })
  })
})

describe('applyResolution', () => {
  const [stream] = normalizeStreams([
    { id: 'b', title: 'Brandon', youtube: pinnedWithChannel, states: ['GA'] },
  ])

  it('returns the stream untouched when it has not been checked', () => {
    expect(applyResolution(stream!, undefined)).toEqual(stream)
  })

  it('swaps embed and link-out to the fallback video', () => {
    const feed = applyResolution(stream!, { status: 'live', fallbackVideoId: '6nTCsMwGwoY' })
    expect(feed.embedUrl).toBe('https://www.youtube.com/embed/6nTCsMwGwoY?autoplay=1&mute=1')
    expect(feed.watchUrl).toBe('https://www.youtube.com/watch?v=6nTCsMwGwoY')
    expect(feed.status).toBe('live')
  })

  it('keeps the configured embed for statuses without a fallback', () => {
    const feed = applyResolution(stream!, { status: 'ended' })
    expect(feed.embedUrl).toBe(stream!.embedUrl)
    expect(feed.watchUrl).toBe(stream!.watchUrl)
    expect(feed.status).toBe('ended')
  })
})

describe('withAutoplay', () => {
  const embed = 'https://www.youtube.com/embed/abc?autoplay=1&mute=1'

  it('drops autoplay for off-screen feeds and keeps the other params', () => {
    const url = new URL(withAutoplay(embed, false))
    expect(url.searchParams.has('autoplay')).toBe(false)
    expect(url.searchParams.get('mute')).toBe('1')
  })

  it('restores autoplay when the feed is back on screen', () => {
    const off = withAutoplay(embed, false)
    expect(new URL(withAutoplay(off, true)).searchParams.get('autoplay')).toBe('1')
  })

  it('works for channel live_stream embeds', () => {
    const url = withAutoplay('https://www.youtube.com/embed/live_stream?channel=UC1&autoplay=1&mute=1', false)
    expect(new URL(url).searchParams.get('channel')).toBe('UC1')
    expect(new URL(url).searchParams.has('autoplay')).toBe(false)
  })
})
