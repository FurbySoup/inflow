import type { Bbox } from '../types'

/**
 * Notification bus (ADR-0019). Sources that detect something new (a chaser going live, a new NWS alert, an SPC
 * watch, MD or risk upgrade) emit one event; the notification engine decides whether and how to deliver it
 * (system notification while the tab is hidden, threshold, rate cap). Emitters never call the Notification API.
 */
export type NotifyKind = 'nws-alert' | 'spc-watch' | 'spc-md' | 'spc-risk' | 'chaser-live'

export interface NotifyEvent {
  kind: NotifyKind
  /** Stable de-dupe key, also the system notification `tag`: an NWS eventKey, `spc-md:1234`, `chaser:<channelId>:<videoId>`. */
  key: string
  /** Short title in console voice, e.g. `TORNADO WARNING · SCREVEN, GA`. NWS products only may say alert/watch/warning. */
  title: string
  /** One plain sentence. */
  body: string
  /** Epoch ms when the source detected it. */
  at: number
  /** Where FOCUS MAP should fly, when the item has a location. */
  focus?: { id: string; bbox: Bbox }
  /** NWS hazard code or SPC category, for the engine's threshold (e.g. `TOR`, `SVR`, `ENH`). */
  level?: string
}

type Listener = (event: NotifyEvent) => void
const listeners = new Set<Listener>()

/** Hands an event to every subscriber (normally just the engine). Emitters de-dupe their own first-load seed. */
export function emitNotify(event: NotifyEvent): void {
  for (const listener of listeners) listener(event)
}

/** Subscribes to every emitted event. Returns the unsubscribe. */
export function subscribeNotify(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
