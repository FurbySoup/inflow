import { useSyncExternalStore } from 'react'
import { useAoi } from '../state/aoi'
import type { NotifyEvent } from '../state/notify'
import { OVERFLOW, TEST_NOTIFICATION } from './notifyCopy'
import { getPrefs, hasSeen, markSeen, passesThreshold } from './prefs'

/**
 * Notification delivery (ADR-0019). The engine is the only place that calls the Notification API.
 * Order per event: drop seen keys → drop below the threshold → visible or no permission: count it in the app
 * (`n NEW` on the control) → otherwise a system notification, subject to the rate cap.
 * SEND TEST (ADR-0022) is the one exception to the order: it always shows, and it is never counted or remembered.
 */

/** At most one system notification per GAP_MS and HOUR_MAX per rolling hour. */
export const GAP_MS = 20_000
export const HOUR_MAX = 10
const HOUR_MS = 60 * 60 * 1000

export interface NoticeOptions {
  body: string
  tag: string
  focus?: NotifyEvent['focus']
}

export interface NoticeHandle {
  close(): void
}

/** The browser seam. Tests swap it for a fake; the app uses `systemIo`. */
export interface EngineIo {
  now(): number
  hidden(): boolean
  /** The browser's permission, or 'unsupported' when the API is missing. */
  permission(): NotificationPermission | 'unsupported'
  /** Shows a system notification. Throws where the browser refuses (most mobile browsers need a service worker). */
  open(title: string, options: NoticeOptions): NoticeHandle
}

export const systemIo: EngineIo = {
  now: () => Date.now(),
  hidden: () => document.visibilityState === 'hidden',
  permission: () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
  open(title, { body, tag, focus }) {
    const notice = new Notification(title, { body, tag, requireInteraction: false })
    // Focus the window, fly the map to the item, then close (ADR-0019).
    notice.onclick = () => {
      window.focus()
      if (focus) useAoi.getState().setFocus(focus)
      notice.close()
    }
    return notice
  },
}

/** What the control shows: the in-app count and whether this browser can show system notifications at all. */
export interface NotifyRuntime {
  count: number
  unsupported: boolean
}

let runtime: NotifyRuntime = { count: 0, unsupported: false }
const runtimeListeners = new Set<() => void>()

function setRuntime(patch: Partial<NotifyRuntime>): void {
  runtime = { ...runtime, ...patch }
  for (const listener of runtimeListeners) listener()
}

export function getNotifyRuntime(): NotifyRuntime {
  return runtime
}

function subscribeRuntime(listener: () => void): () => void {
  runtimeListeners.add(listener)
  return () => {
    runtimeListeners.delete(listener)
  }
}

/** Live count and support state for React. */
export function useNotifyRuntime(): NotifyRuntime {
  return useSyncExternalStore(subscribeRuntime, getNotifyRuntime)
}

/** Clears the in-app count (the control does this when its popover closes). */
export function clearNotifyCount(): void {
  if (runtime.count > 0) setRuntime({ count: 0 })
}

/** Test helper: back to a fresh runtime. */
export function resetNotifyRuntime(): void {
  setRuntime({ count: 0, unsupported: false })
}

function bump(n: number): void {
  setRuntime({ count: runtime.count + n })
}

/** Next instant at which the rate cap allows a system notification (`now` when it allows one already). */
export function nextSlot(sent: readonly number[], now: number): number {
  const recent = sent.filter((t) => now - t < HOUR_MS)
  let at = now
  const last = recent[recent.length - 1]
  if (last !== undefined) at = Math.max(at, last + GAP_MS)
  if (recent.length >= HOUR_MAX) at = Math.max(at, recent[recent.length - HOUR_MAX] + HOUR_MS)
  return at
}

/**
 * Shows the SEND TEST notice. Returns the handle, or null when the browser refused (or permission isn't granted).
 * A refused constructor marks the runtime unsupported, so the control can say why.
 */
function openTest(io: EngineIo): NoticeHandle | null {
  const permission = io.permission()
  if (permission === 'unsupported') {
    setRuntime({ unsupported: true })
    return null
  }
  if (permission !== 'granted') return null
  try {
    return io.open(TEST_NOTIFICATION.title, { body: TEST_NOTIFICATION.body, tag: 'notify-test' })
  } catch {
    setRuntime({ unsupported: true })
    return null
  }
}

/** SEND TEST from the control: the browser's own system notice, through the same seam as the engine. */
export function sendTestNotification(): 'shown' | 'refused' {
  return openTest(systemIo) ? 'shown' : 'refused'
}

/**
 * One delivery engine per mounted app. `handle` receives bus events; `onVisible` closes what it opened and counts
 * whatever was waiting. Overflow past the rate cap waits for the next slot and goes out as one `OVERFLOW` notice.
 */
export function createEngine(io: EngineIo = systemIo) {
  const sent: number[] = []
  let deferred: NotifyEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  const opened = new Set<NoticeHandle>()

  const systemAllowed = () => io.permission() === 'granted' && !runtime.unsupported

  function schedule(now: number): void {
    if (timer !== null) return
    timer = setTimeout(flush, Math.max(0, nextSlot(sent, now) - now))
  }

  /** Shows one notice, recording the send. False when the browser refused (the caller counts it in-app). */
  function send(title: string, options: NoticeOptions, now: number): boolean {
    let handle: NoticeHandle
    try {
      handle = io.open(title, options)
    } catch {
      setRuntime({ unsupported: true })
      return false
    }
    while (sent.length > 0 && now - sent[0] >= HOUR_MS) sent.shift()
    sent.push(now)
    opened.add(handle)
    return true
  }

  function flush(): void {
    timer = null
    if (deferred.length === 0) return
    const now = io.now()
    if (io.hidden() === false || !systemAllowed()) {
      bump(deferred.length)
      deferred = []
      return
    }
    if (nextSlot(sent, now) > now) {
      schedule(now)
      return
    }
    const batch = deferred
    deferred = []
    const ok =
      batch.length === 1
        ? send(batch[0].title, { body: batch[0].body, tag: batch[0].key, focus: batch[0].focus }, now)
        : send(OVERFLOW.title(batch.length), { body: OVERFLOW.body, tag: 'notify-overflow' }, now)
    if (!ok) bump(batch.length)
  }

  return {
    handle(event: NotifyEvent): void {
      const prefs = getPrefs()
      if (!prefs.enabled) return
      if (hasSeen(event.key)) return
      const now = io.now()
      markSeen(event.key, now)
      if (!passesThreshold(event, prefs.threshold)) return
      if (io.hidden() === false || !systemAllowed()) {
        bump(1)
        return
      }
      if (deferred.length > 0 || nextSlot(sent, now) > now) {
        deferred.push(event)
        schedule(now)
        return
      }
      if (!send(event.title, { body: event.body, tag: event.key, focus: event.focus }, now)) bump(1)
    },

    /** SEND TEST: one notice now, whatever the visibility, rate cap or threshold. Not counted, not remembered. */
    sendTest(): 'shown' | 'refused' {
      const handle = openTest(io)
      if (handle === null) return 'refused'
      opened.add(handle)
      return 'shown'
    },

    /** The tab is visible again: close the system notices and count anything still waiting. */
    onVisible(): void {
      for (const notice of opened) notice.close()
      opened.clear()
      if (deferred.length > 0) {
        bump(deferred.length)
        deferred = []
      }
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },

    dispose(): void {
      if (timer !== null) clearTimeout(timer)
      timer = null
      deferred = []
    },
  }
}
