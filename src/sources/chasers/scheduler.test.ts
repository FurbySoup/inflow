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
  let visibleListeners = new Set<() => void>()
  const fireVisible = () => {
    visible = true
    for (const listener of [...visibleListeners]) listener()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    visible = true
    visibleListeners = new Set()
    emit.mockReset()
    vi.mocked(fetchChannelState).mockReset()
    vi.mocked(fetchWatchState).mockReset()
    vi.mocked(fetchChannelState).mockResolvedValue('offline')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const make = (list: Chaser[] = chasers, aoi: string[] = ['GA']) => makeFrom(() => list, aoi)

  const makeFrom = (list: () => Chaser[], aoi: string[] = ['GA']) =>
    createScheduler({
      chasers: list,
      check: checkRosterChannel,
      aoiStates: () => aoi,
      visible: () => visible,
      now: () => Date.now(),
      emit,
      onVisible: (listener) => {
        visibleListeners.add(listener)
        return () => {
          visibleListeners.delete(listener)
        }
      },
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

  it('a visible event while the hidden-pace timer is pending checks at once', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    visible = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    fireVisible()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchChannelState).toHaveBeenCalledTimes(3)
    s.stop()
  })

  it('a visible event while a check is in flight starts no second check', async () => {
    vi.mocked(fetchChannelState).mockReturnValue(new Promise(() => {}))
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    visible = false
    fireVisible()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    s.stop()
  })

  it('a visible event after a hidden-pace timer fired, with its check still in flight, starts no second check', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    visible = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    // The next check hangs: the fired hidden timer's handle is still set, so only the in-flight guard stops a re-arm.
    vi.mocked(fetchChannelState).mockReturnValue(new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(3)
    fireVisible()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchChannelState).toHaveBeenCalledTimes(3)
    s.stop()
  })

  it('a visible event after stop does nothing, and the listener is removed', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    visible = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    s.stop()
    expect(visibleListeners.size).toBe(0)
    fireVisible()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
  })

  it('a visible event while the timer is already at the visible pace adds no check', async () => {
    const s = make()
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    fireVisible()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(9_999)
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    s.stop()
  })

  it('a channel added between passes is in the next pass', async () => {
    let list = [chaser('a', []), chaser('b', [])]
    const s = makeFrom(() => list)
    s.start()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchChannelState).toHaveBeenCalledTimes(2)
    list = [...list, chaser('c', [])]
    await vi.advanceTimersByTimeAsync(30_000)
    expect(vi.mocked(fetchChannelState).mock.calls.map((c) => c[0])).toEqual([
      channelOf('a'),
      channelOf('b'),
      channelOf('a'),
      channelOf('b'),
      channelOf('c'),
    ])
    s.stop()
  })

  it('checkNow checks one channel at once and leaves the round-robin where it was', async () => {
    const s = make([chaser('a', []), chaser('b', []), chaser('c', [])])
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    await s.checkNow(channelOf('c'))
    expect(vi.mocked(fetchChannelState).mock.calls.map((c) => c[0])).toEqual([channelOf('a'), channelOf('c')])
    expect(s.getState().results.get(channelOf('c'))?.state).toBe('offline')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(vi.mocked(fetchChannelState).mock.calls[2]?.[0]).toBe(channelOf('b'))
    s.stop()
  })

  it('checkNow ignores a channel that is not in the list', async () => {
    const s = make([chaser('a', [])])
    s.start()
    await vi.advanceTimersByTimeAsync(0)
    await s.checkNow(channelOf('zz'))
    expect(fetchChannelState).toHaveBeenCalledTimes(1)
    s.stop()
  })

  it('a removed channel disappears from results', async () => {
    let list = [chaser('a', []), chaser('b', [])]
    const s = makeFrom(() => list)
    s.start()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(s.getState().results.has(channelOf('b'))).toBe(true)
    list = [chaser('a', [])]
    await vi.advanceTimersByTimeAsync(10_000)
    expect(s.getState().results.has(channelOf('b'))).toBe(false)
    expect(s.getState().results.has(channelOf('a'))).toBe(true)
    s.stop()
  })
})
