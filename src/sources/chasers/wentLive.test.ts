import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchChannelState, fetchWatchState } from '../streams/liveness'
import type { NotifyEvent } from '../../state/notify'
import type { Chaser } from './roster'
import { wentLiveEvents } from './wentLive'
import { createScheduler, checkRosterChannel, type RosterResult } from './scheduler'

vi.mock('../streams/liveness', () => ({
  fetchChannelState: vi.fn(),
  fetchWatchState: vi.fn(),
}))

const VIDEO_1 = 'AAAAAAAAAAA'
const VIDEO_2 = 'BBBBBBBBBBB'
const alpha: Chaser = {
  id: 'alpha',
  name: 'Alpha Chaser',
  handle: '@alpha',
  channelId: 'UCalphaalphaalphaalpha1',
  kind: 'chaser',
  regions: ['national'],
  states: [],
}
const outlet: Chaser = { ...alpha, id: 'outlet', name: 'Outlet TV', channelId: 'UCoutletoutletoutlet12', kind: 'coverage', states: ['TN'] }
const roster = [alpha, outlet]

const map = (entries: [string, RosterResult][]) => new Map(entries)
const offline = (t = 1): RosterResult => ({ state: 'offline', checkedAt: t })
const live = (videoId: string, t = 1): RosterResult => ({ state: 'live', videoId, checkedAt: t })

describe('wentLiveEvents', () => {
  it('offline to live emits once, with the right key and title', () => {
    const prev = map([[alpha.channelId, offline()]])
    const next = map([[alpha.channelId, live(VIDEO_1, 2)]])
    const events = wentLiveEvents(prev, next, roster, 99)
    expect(events).toEqual([
      {
        kind: 'chaser-live',
        key: `chaser:${alpha.channelId}:${VIDEO_1}`,
        title: 'CHASER LIVE · ALPHA CHASER',
        body: 'Alpha Chaser is streaming live.',
        at: 99,
        level: 'CHASER',
      },
    ])
  })

  it('never checked to live emits too', () => {
    const events = wentLiveEvents(new Map(), map([[alpha.channelId, live(VIDEO_1)]]), roster, 1)
    expect(events).toHaveLength(1)
  })

  it('the same videoId again emits nothing', () => {
    const prev = map([[alpha.channelId, live(VIDEO_1)]])
    const next = map([[alpha.channelId, live(VIDEO_1, 5)]])
    expect(wentLiveEvents(prev, next, roster, 1)).toEqual([])
  })

  it('a coverage channel gets the COVERAGE title', () => {
    const events = wentLiveEvents(map([[outlet.channelId, offline()]]), map([[outlet.channelId, live(VIDEO_2)]]), roster, 1)
    expect(events[0]?.title).toBe('COVERAGE LIVE · OUTLET TV')
    expect(events[0]?.key).toBe(`chaser:${outlet.channelId}:${VIDEO_2}`)
  })
})

describe('went-live through the scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fetchChannelState).mockReset()
    vi.mocked(fetchWatchState).mockReset()
    vi.mocked(fetchWatchState).mockResolvedValue('live')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits nothing during the seed pass, then emits once when a channel goes live', async () => {
    const emit = vi.fn<(event: NotifyEvent) => void>()
    // AOI is TN, so the outlet is checked first each pass. Seed: outlet live, alpha offline (no events).
    // Pass 2: outlet still live (no event), alpha goes live (one CHASER event).
    vi.mocked(fetchChannelState)
      .mockResolvedValueOnce({ videoId: VIDEO_1 })
      .mockResolvedValueOnce('offline')
      .mockResolvedValueOnce({ videoId: VIDEO_1 })
      .mockResolvedValueOnce({ videoId: VIDEO_2 })
    const s = createScheduler({
      chasers: roster,
      check: checkRosterChannel,
      aoiStates: () => ['TN'],
      visible: () => true,
      now: () => Date.now(),
      emit,
    })
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(s.getState().passes).toBe(1)
    expect(emit).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(20_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0].title).toBe('CHASER LIVE · ALPHA CHASER')
    expect(emit.mock.calls[0]?.[0].key).toBe(`chaser:${alpha.channelId}:${VIDEO_2}`)
    s.stop()
  })
})
