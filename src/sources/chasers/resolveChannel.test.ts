import { afterEach, describe, expect, it, vi } from 'vitest'

import channelHtml from './fixtures/channel-ryanhall.html?raw'
import consentHtml from './fixtures/consent.html?raw'
import watchHtml from './fixtures/watch-ryanhall.html?raw'
import { parseChannelInput, parseChannelPage, parseWatchOwner, resolveChannel } from './resolveChannel'

const CHANNEL = 'UCJHAT3Uvv-g3I8H3GhHWV7w'
const VIDEO = 'W9DAYdxU4uE'

describe('parseChannelInput', () => {
  it.each([
    ['@RyanHallYall', { kind: 'handle', handle: '@RyanHallYall' }],
    ['  @RyanHallYall  ', { kind: 'handle', handle: '@RyanHallYall' }],
    ['youtube.com/@RyanHallYall', { kind: 'handle', handle: '@RyanHallYall' }],
    ['https://www.youtube.com/@RyanHallYall/videos', { kind: 'handle', handle: '@RyanHallYall' }],
    ['m.youtube.com/@RyanHallYall', { kind: 'handle', handle: '@RyanHallYall' }],
    [CHANNEL, { kind: 'channel', channelId: CHANNEL }],
    [`youtube.com/channel/${CHANNEL}`, { kind: 'channel', channelId: CHANNEL }],
    [`https://youtube.com/channel/${CHANNEL}/featured`, { kind: 'channel', channelId: CHANNEL }],
    ['youtube.com/c/RyanHall', { kind: 'path', path: '/c/RyanHall' }],
    ['https://www.youtube.com/user/RyanHall', { kind: 'path', path: '/user/RyanHall' }],
    [`youtube.com/watch?v=${VIDEO}`, { kind: 'video', videoId: VIDEO }],
    [`https://m.youtube.com/watch?v=${VIDEO}&t=5`, { kind: 'video', videoId: VIDEO }],
    [`youtube.com/live/${VIDEO}`, { kind: 'video', videoId: VIDEO }],
    [`youtu.be/${VIDEO}`, { kind: 'video', videoId: VIDEO }],
    [`https://youtu.be/${VIDEO}?si=abc`, { kind: 'video', videoId: VIDEO }],
  ])('accepts %s', (input, expected) => {
    expect(parseChannelInput(input)).toEqual(expected)
  })

  it.each([
    '',
    '   ',
    'just some words',
    '@ab',
    '@has space',
    'https://example.com/@RyanHallYall',
    'https://youtube.com.evil.com/@RyanHallYall',
    'https://evil.com/youtube.com/@RyanHallYall',
    'https://youtube.com/',
    'youtube.com/watch?v=short',
    'youtube.com/watch',
    'youtube.com/channel/UCshort',
    'youtube.com/videos',
    'youtu.be/short',
    'UC-too-short',
  ])('rejects %j', (input) => {
    expect(parseChannelInput(input)).toBeNull()
  })
})

describe('parseChannelPage', () => {
  it('reads the channel id, the decoded name and the handle from the real page', () => {
    expect(parseChannelPage(channelHtml)).toEqual({ channelId: CHANNEL, name: "Ryan Hall, Y'all", handle: '@RyanHallYall' })
  })

  it('decodes entities once, numeric ones included', () => {
    const html = channelHtml.replace(
      'content="Ryan Hall, Y&#39;all"',
      'content="A &amp;#39; B &amp;amp; &quot;C&quot; &#x41;&#66;"',
    )
    expect(parseChannelPage(html)?.name).toBe('A &#39; B &amp; "C" AB')
  })

  it('returns null when the canonical id and the first externalId disagree', () => {
    const other = `UC${'A'.repeat(22)}`
    const html = channelHtml.replace(`/channel/${CHANNEL}"`, `/channel/${other}"`)
    expect(parseChannelPage(html)).toBeNull()
  })

  it('returns null for the consent page', () => {
    expect(parseChannelPage(consentHtml)).toBeNull()
  })
})

describe('parseWatchOwner', () => {
  it('reads the owning channel from the real watch page', () => {
    expect(parseWatchOwner(watchHtml)).toBe(CHANNEL)
  })

  it('returns null when there are no video details', () => {
    expect(parseWatchOwner(consentHtml)).toBeNull()
  })
})

describe('resolveChannel', () => {
  const fetchMock = vi.fn<typeof fetch>()

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  const page = (body: string, status = 200) => Promise.resolve(new Response(body, { status }))
  const urls = () => fetchMock.mock.calls.map((call) => String(call[0]))

  it('a handle makes one channel-page request through the proxy', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page(channelHtml))
    const result = await resolveChannel('@RyanHallYall')
    expect(result).toEqual({ ok: true, channel: { channelId: CHANNEL, name: "Ryan Hall, Y'all", handle: '@RyanHallYall' } })
    expect(urls()).toEqual(['/api/youtube/@RyanHallYall'])
  })

  it('a video link fetches the watch page, then the owner channel page', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page(watchHtml)).mockReturnValueOnce(page(channelHtml))
    const result = await resolveChannel(`https://youtu.be/${VIDEO}`)
    expect(result.ok && result.channel.channelId).toBe(CHANNEL)
    expect(urls()).toEqual([`/api/youtube/watch?v=${VIDEO}`, `/api/youtube/channel/${CHANNEL}`])
  })

  it('a 404 is not-found', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page('', 404))
    expect(await resolveChannel('@ThisHandleDoesNotExist123xyz')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('a network error is unreachable', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await resolveChannel('@RyanHallYall')).toEqual({ ok: false, reason: 'unreachable' })
  })

  it('a non-200 other than 404 is unreachable', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page('', 502))
    expect(await resolveChannel('@RyanHallYall')).toEqual({ ok: false, reason: 'unreachable' })
  })

  it('a consent page that answers 200 is unreachable, never a channel', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page(consentHtml))
    expect(await resolveChannel('@RyanHallYall')).toEqual({ ok: false, reason: 'unreachable' })
  })

  it('unrecognised input makes no request', async () => {
    vi.stubGlobal('fetch', fetchMock)
    expect(await resolveChannel('https://example.com/@RyanHallYall')).toEqual({ ok: false, reason: 'unrecognised' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('every fetched URL starts with /api/youtube/', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReturnValueOnce(page(watchHtml)).mockReturnValueOnce(page(channelHtml))
    await resolveChannel(`youtube.com/watch?v=${VIDEO}`)
    for (const url of urls()) expect(url.startsWith('/api/youtube/')).toBe(true)
  })
})
