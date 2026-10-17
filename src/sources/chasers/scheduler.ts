import { fetchChannelState, fetchWatchState, type ChannelState } from '../streams/liveness'
import { emitNotify, type NotifyEvent } from '../../state/notify'
import type { Chaser } from './roster'
import { wentLiveEvents } from './wentLive'

export type RosterStatus = 'live' | 'offline' | 'unknown'

export interface RosterResult {
  state: RosterStatus
  videoId?: string
  checkedAt: number
}

export interface RosterState {
  /** Keyed by channelId. Its size is the CHECKED count. */
  results: ReadonlyMap<string, RosterResult>
  /** Completed full passes. The first pass only seeds: it never emits went-live events. */
  passes: number
}

/** Visible: one channel every 10 s, so a full pass of 58 takes about 10 min. */
export const VISIBLE_STEP_MS = 10_000
/** Hidden: one channel a minute. Browsers throttle hidden timers anyway (ADR-0019). */
export const HIDDEN_STEP_MS = 60_000

export function stepMs(visible: boolean): number {
  return visible ? VISIBLE_STEP_MS : HIDDEN_STEP_MS
}

/**
 * Channel IDs for one pass: channels in the AOI first, then national (no states), then the rest.
 * Roster order is kept within each tier. Computed at the start of each pass from the current AOI states.
 */
export function passOrder(chasers: readonly Chaser[], aoiStates: readonly string[]): string[] {
  const rank = (c: Chaser) => {
    if (c.states.some((s) => aoiStates.includes(s))) return 0
    return c.states.length === 0 ? 1 : 2
  }
  return [...chasers].sort((a, b) => rank(a) - rank(b)).map((c) => c.channelId)
}

/**
 * Records one check. `unknown` keeps the previous state (and videoId) and only refreshes `checkedAt`;
 * with no previous answer it is recorded as unknown, so the CHECKED count still advances. Never treat unknown as offline.
 */
export function applyCheck(
  prev: ReadonlyMap<string, RosterResult>,
  channelId: string,
  result: ChannelState,
  now: number,
): Map<string, RosterResult> {
  const next = new Map(prev)
  const before = prev.get(channelId)
  if (result === 'unknown') {
    next.set(channelId, before ? { ...before, checkedAt: now } : { state: 'unknown', checkedAt: now })
  } else if (result === 'offline') {
    next.set(channelId, { state: 'offline', checkedAt: now })
  } else {
    next.set(channelId, { state: 'live', videoId: result.videoId, checkedAt: now })
  }
  return next
}

/**
 * One roster check. The channel embed can name a scheduled stream, not only a live one (see liveness.ts),
 * so a named video counts as live only when its own watch page says so. Upcoming/ended/removed mean offline.
 * Liveness budget (ADR-0013): one channel check per step (6/min visible, 1/min hidden), plus one watch
 * check only for a channel that names a video.
 */
export async function checkRosterChannel(channelId: string, signal?: AbortSignal): Promise<ChannelState> {
  const state = await fetchChannelState(channelId, signal)
  if (typeof state === 'string') return state
  const watch = await fetchWatchState(state.videoId, signal)
  if (watch === 'live') return state
  return watch === 'unknown' ? 'unknown' : 'offline'
}

export interface SchedulerDeps {
  /** Read at the start of each pass and whenever a result is recorded, so added and removed chasers take effect. */
  chasers: () => readonly Chaser[]
  check: (channelId: string, signal: AbortSignal) => Promise<ChannelState>
  /** Read at the start of each pass. */
  aoiStates: () => readonly string[]
  visible: () => boolean
  now: () => number
  emit: (event: NotifyEvent) => void
  /** Calls the listener when the tab becomes visible. Returns the remover. Absent: no re-arm. */
  onVisible?: (listener: () => void) => () => void
}

export interface RosterScheduler {
  start(): void
  stop(): void
  /** One out-of-band check of a channel (WP-48). Does not move the round-robin. */
  checkNow(channelId: string): Promise<void>
  getState(): RosterState
  subscribe(listener: () => void): () => void
}

/** Drops results for channels no longer in the list. Returns the same map. */
function pruneResults(results: Map<string, RosterResult>, chasers: readonly Chaser[]): Map<string, RosterResult> {
  const ids = new Set(chasers.map((c) => c.channelId))
  for (const id of [...results.keys()]) if (!ids.has(id)) results.delete(id)
  return results
}

/**
 * Round-robin liveness for the roster: one request in flight at a time, paced by stepMs(visible).
 * Every pass re-checks every channel, so a live channel that ends drops within one pass.
 * getState returns the same object until something changes (useSyncExternalStore-safe).
 */
export function createScheduler(deps: SchedulerDeps): RosterScheduler {
  let state: RosterState = { results: new Map(), passes: 0 }
  const listeners = new Set<() => void>()
  let running = false
  // Bumped on every start and stop, so a check left over from an earlier run can never schedule another.
  let session = 0
  let order: string[] = []
  let pos = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  // Pace the pending timer was armed with: true when hidden (60 s), so a visible event can pull it forward.
  let timerHidden = false
  let controller: AbortController | undefined
  // Out-of-band checks from checkNow, aborted by stop.
  const extra = new Set<AbortController>()
  let removeVisible: (() => void) | undefined

  // Re-arm: a hidden-pace wait could hold the next check for up to 60 s after the tab returns.
  // With a check in flight, its own completion arms the visible pace, so nothing happens here.
  const onVisible = () => {
    if (!running || timer === undefined || controller !== undefined || !timerHidden) return
    clearTimeout(timer)
    timer = undefined
    void tick(session)
  }

  const publish = (next: RosterState) => {
    state = next
    for (const listener of listeners) listener()
  }

  async function tick(current: number): Promise<void> {
    if (!running || current !== session) return
    if (pos === 0) order = passOrder(deps.chasers(), deps.aoiStates())
    const channelId = order[pos]
    if (channelId === undefined) return

    const started = deps.now()
    const ctrl = new AbortController()
    controller = ctrl
    let result: ChannelState
    try {
      result = await deps.check(channelId, ctrl.signal)
    } catch {
      result = 'unknown'
    }
    if (!running || current !== session) return
    controller = undefined

    const now = deps.now()
    const prevResults = state.results
    const chasers = deps.chasers()
    const results = pruneResults(applyCheck(prevResults, channelId, result, now), chasers)
    const seeded = state.passes > 0
    pos += 1
    let passes = state.passes
    if (pos >= order.length) {
      pos = 0
      passes += 1
    }
    publish({ results, passes })
    if (seeded) for (const event of wentLiveEvents(prevResults, results, chasers, now)) deps.emit(event)

    const visibleNow = deps.visible()
    const wait = Math.max(0, stepMs(visibleNow) - (now - started))
    timerHidden = !visibleNow
    timer = setTimeout(() => void tick(current), wait)
  }

  return {
    start() {
      if (running) return
      running = true
      session += 1
      removeVisible = deps.onVisible?.(onVisible)
      void tick(session)
    },
    stop() {
      running = false
      session += 1
      removeVisible?.()
      removeVisible = undefined
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      controller?.abort()
      controller = undefined
      for (const ctrl of extra) ctrl.abort()
      extra.clear()
    },
    async checkNow(channelId) {
      if (!deps.chasers().some((c) => c.channelId === channelId)) return
      const ctrl = new AbortController()
      extra.add(ctrl)
      let result: ChannelState
      try {
        result = await deps.check(channelId, ctrl.signal)
      } catch {
        result = 'unknown'
      } finally {
        extra.delete(ctrl)
      }
      // Stopped while in flight: the result is dropped, as the round-robin drops its own.
      if (ctrl.signal.aborted) return
      const now = deps.now()
      const prevResults = state.results
      const chasers = deps.chasers()
      const seeded = state.passes > 0
      const results = pruneResults(applyCheck(prevResults, channelId, result, now), chasers)
      publish({ results, passes: state.passes })
      if (seeded) for (const event of wentLiveEvents(prevResults, results, chasers, now)) deps.emit(event)
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** The app's scheduler: the real roster, the real liveness fetches, the AOI from the map, and the notify bus. */
export function defaultDeps(chasers: () => readonly Chaser[], aoiStates: () => readonly string[]): SchedulerDeps {
  return {
    chasers,
    check: checkRosterChannel,
    aoiStates,
    visible: () => document.visibilityState === 'visible',
    now: () => Date.now(),
    emit: emitNotify,
    onVisible: (listener) => {
      const handler = () => {
        if (document.visibilityState === 'visible') listener()
      }
      document.addEventListener('visibilitychange', handler)
      return () => document.removeEventListener('visibilitychange', handler)
    },
  }
}
