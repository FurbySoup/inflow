import { describe, expect, it } from 'vitest'
import { normalizeStreams, watchUrl } from './curated'

describe('normalizeStreams', () => {
  it('builds video and channel embed URLs', () => {
    const [v, c] = normalizeStreams([
      { id: 'a', title: 'A', youtube: { videoId: 'abc' }, states: ['GA'] },
      { id: 'b', title: 'B', youtube: { channelId: 'UC123' }, states: ['OK'] },
    ])
    expect(v.embedUrl).toContain('/embed/abc')
    expect(c.embedUrl).toContain('live_stream?channel=UC123')
  })

  it('defaults context to false and carries the flag when set', () => {
    const [plain, ctx] = normalizeStreams([
      { id: 'a', title: 'A', youtube: { videoId: 'abc' }, states: [] },
      { id: 'iss', title: 'ISS', youtube: { channelId: 'UCiss' }, states: [], context: true },
    ])
    expect(plain.context).toBe(false)
    expect(ctx.context).toBe(true)
  })
})

describe('watchUrl', () => {
  it('links a pinned video to its watch page', () => {
    expect(watchUrl({ videoId: '7kQACmPd6Io' })).toBe('https://www.youtube.com/watch?v=7kQACmPd6Io')
  })

  it('links a channel to its live page', () => {
    expect(watchUrl({ channelId: 'UC123' })).toBe('https://www.youtube.com/channel/UC123/live')
  })
})
