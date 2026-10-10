import { describe, expect, it } from 'vitest'
import { normalizeStreams } from './curated'

describe('normalizeStreams', () => {
  it('builds video and channel embed URLs', () => {
    const [v, c] = normalizeStreams([
      { id: 'a', title: 'A', youtube: { videoId: 'abc' }, states: ['GA'] },
      { id: 'b', title: 'B', youtube: { channelId: 'UC123' }, states: ['OK'] },
    ])
    expect(v.embedUrl).toContain('/embed/abc')
    expect(c.embedUrl).toContain('live_stream?channel=UC123')
  })
})
