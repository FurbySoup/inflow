import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchChannelState, fetchWatchState } from '../streams/liveness'
import type { NotifyEvent } from '../../state/notify'
import type { Chaser } from './roster'
import { applyCheck, checkRosterChannel, createScheduler, passOrder, type RosterResult } from './scheduler'

vi.mock('../streams/liveness', () => ({
  fetchChannelState: vi.fn(),
  fetchWatchState: vi.fn(),
}))

const chaser = (id: string, states: string[]): Chaser => ({
  id,
  name: id,
  handle: `@${id}`,
  channelId: `UC${id.padEnd(22, 'x')}`,
  kind: 'chaser',
  regions: ['national'],
  states,
})

const VIDEO = 'abcdefghijk'
const chasers = [chaser('a', ['TX']), chaser('b', []), chaser('c', ['GA']), chaser('d', ['GA', 'SC'])]
const channelOf = (id: string) => `UC${id.padEnd(22, 'x')}`

describe('passOrder', () => {
  it('lists AOI-relevant channels first, then national, then the rest', () => {
    expect(passOrder(chasers, ['GA', 'SC'])).toEqual([channelOf('c'), channelOf('d'), channelOf('b'), channelOf('a')])
  })
})

describe('applyCheck', () => {
  it('unknown keeps the previous state and videoId, and only refreshes checkedAt', () => {
    const prev = new Map<string, RosterResult>([[channelOf('a'), { state: 'live', videoId: VIDEO, checkedAt: 1 }]])
    const next = applyCheck(prev, channelOf('a'), 'unknown', 5)
    expect(next.get(channelOf('a'))).toEqual({ state: 'live', videoId: VIDEO, checkedAt: 5 })
  })

  it('unknown with no previous answer is recorded as unknown, never as offline', () => {
    const next = applyCheck(new Map(), channelOf('a'), 'unknown', 5)
    expect(next.get(channelOf('a'))?.state).toBe('unknown')
  })
})

describe('checkRosterChannel', () => {
  beforeEach(() => {
    vi.mocked(fetchChannelState).mockReset()
    vi.mocked(fetchWatchState).mockReset()
  })

  it('a channel that names a video counts as live only when its watch page says live', async () => {
    vi.mocked(fetchChannelState).mockResolvedValue({ videoId: VIDEO })
    vi.mocked(fetchWatchState).mockResolvedValue('upcoming')
    expect(await checkRosterChannel('UCx')).toBe('offline')
    vi.mocked(fetchWatchState).mockResolvedValue('live')
    expect(await checkRosterChannel('UCx')).toEqual({ videoId: VIDEO })
  })
})

describe('createScheduler', () => {
  let visible = true
  const emit = vi.fn<(event: NotifyEvent) => void>()

  beforeEach(() => {
    vi.useFakeTimers()
    visible = true
    emit.mockReset()
    vi.mocked(fetchChannelState).mockReset()
    vi.mocked(fetchWatchState).mockReset()
    vi.mocked(fetchChannelState).mockResolvedValue('offline')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const make = (list: Chaser[] = chasers, aoi: string[] = ['GA']) =>
    createScheduler({
      chasers: list,
      check: checkRosterChannel,
      aoiStates: () => aoi,
      visible: () => visible,
      now: () => Date.now(),
      emit,
    })

  it('checks one channel at start, then every 10 s while visible and every 60 s while hidden', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    visible = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(4)
    s.stop()
  })

  it('checks AOI-relevant channels first in each pass', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    const first = vi.mocked(fetchChannelState).mock.calls[0]?.[0]
    expect(first).toBe(channelOf('c'))
    s.stop()
  })

  it('keeps one request in flight', async () => {
    vi.mocked(fetchChannelState).mockReturnValue(new Promise(() => {}))
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    s.stop()
  })

  it('unknown keeps the previous live state on a later pass', async () => {
    vi.mocked(fetchChannelState).mockResolvedValueOnce({ videoId: VIDEO }).mockResolvedValue('unknown')
    vi.mocked(fetchWatchState).mockResolvedValue('live')
    const s = make([chaser('a', ['GA'])])
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(s.getState().results.get(channelOf('a'))?.state).toBe('live')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(s.getState().results.get(channelOf('a'))?.state).toBe('live')
    s.stop()
  })
})
