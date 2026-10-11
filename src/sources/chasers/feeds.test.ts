import { describe, expect, it } from 'vitest'

import { curatedStreams } from '../streams/curated'
import type { LiveFeed } from '../streams/resolve'
import { mergeRoster, rosterFeedId, rosterLive, spotterMapUrl } from './feeds'
import { ROSTER, type Chaser } from './roster'
import type { RosterResult } from './scheduler'

const FREDDY_CHANNEL = 'UCZSDkxJS7PRw9V0_Sm6U7jg'
const VIDEO = 'LIVEVIDEO01'

const curated = (): LiveFeed[] => curatedStreams.map((s) => ({ ...s }))
const chaserFor = (channelId: string): Chaser => {
  const found = ROSTER.find((c) => c.channelId === channelId)
  if (!found) throw new Error(`not in roster: ${channelId}`)
  return found
}

describe('rosterLive', () => {
  it('returns only channels confirmed live, in roster order', () => {
    const first = ROSTER[0]
    const last = ROSTER[ROSTER.length - 1]
    if (!first || !last) throw new Error('roster is empty')
    const results = new Map<string, RosterResult>([
      [first.channelId, { state: 'offline', checkedAt: 1 }],
      [last.channelId, { state: 'live', videoId: VIDEO, checkedAt: 1 }],
    ])
    expect(rosterLive(ROSTER, results)).toEqual([{ chaser: last, videoId: VIDEO }])
  })

  it('unknown never creates a tile', () => {
    const first = ROSTER[0]
    if (!first) throw new Error('roster is empty')
    expect(rosterLive(ROSTER, new Map([[first.channelId, { state: 'unknown', checkedAt: 1 }]]))).toEqual([])
  })
})

describe('mergeRoster', () => {
  it('a curated entry sharing a channelId with a live roster result yields one feed', () => {
    const live = [{ chaser: chaserFor(FREDDY_CHANNEL), videoId: VIDEO }]
    const base = curated()
    const { feeds, videoIds } = mergeRoster(base, live)
    const onChannel = feeds.filter((f) => f.youtube.channelId === FREDDY_CHANNEL)
    expect(onChannel).toHaveLength(base.filter((f) => f.youtube.channelId === FREDDY_CHANNEL).length)
    expect(feeds).toHaveLength(base.length)
    expect(videoIds.get(base.find((f) => f.youtube.channelId === FREDDY_CHANNEL)?.id ?? '')).toBe(VIDEO)
  })

  it('a live roster channel not in the curated list is appended as a live feed', () => {
    const chaser = ROSTER.find((c) => !curatedStreams.some((s) => s.youtube.channelId === c.channelId))
    if (!chaser) throw new Error('every roster channel is curated')
    const { feeds, videoIds } = mergeRoster(curated(), [{ chaser, videoId: VIDEO }])
    const added = feeds[feeds.length - 1]
    expect(added).toMatchObject({
      id: rosterFeedId(chaser.channelId),
      title: chaser.name,
      states: chaser.states,
      status: 'live',
      context: false,
      embedUrl: `https://www.youtube.com/embed/${VIDEO}?autoplay=1&mute=1`,
      watchUrl: `https://www.youtube.com/watch?v=${VIDEO}`,
    })
    expect(videoIds.get(rosterFeedId(chaser.channelId))).toBe(VIDEO)
  })

  it('an offline roster channel adds nothing', () => {
    expect(mergeRoster(curated(), []).feeds).toHaveLength(curatedStreams.length)
  })
})

describe('spotterMapUrl', () => {
  it('centres on the AOI at zoom 7 and uses the lon parameter', () => {
    const url = new URL(spotterMapUrl({ west: -85.6, south: 30.4, east: -78.5, north: 35.3 }))
    expect(url.origin + url.pathname).toBe('https://www.spotternetwork.org/pages/map')
    expect(url.searchParams.get('lat')).toBe('32.8500')
    expect(url.searchParams.get('lon')).toBe('-82.0500')
    expect(url.searchParams.get('zoom')).toBe('7')
    expect(url.searchParams.has('lng')).toBe(false)
  })
})
