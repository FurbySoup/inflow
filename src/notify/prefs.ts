import { useSyncExternalStore } from 'react'
import type { NotifyEvent } from '../state/notify'

/**
 * Notification preferences (ADR-0019), persisted to localStorage. The threshold is cumulative: each step includes the
 * ones before it. Events outside every step (SPS, other NWS products) never notify.
 */
export const THRESHOLDS = ['TOR', 'WARNINGS', 'WATCHES', 'RISK', 'CHASERS'] as const
export type Threshold = (typeof THRESHOLDS)[number]

export type PermissionState = 'granted' | 'denied' | 'default'

export interface NotifyPrefs {
  /** The user turned notifications on (in-app count works either way once on). */
  enabled: boolean
  threshold: Threshold
  /** Last permission the browser reported. Re-read from `Notification.permission` when the control opens. */
  permission: PermissionState
  /** De-dupe keys already handled, with the epoch ms they were handled at. Pruned to 48 h. */
  seen: Record<string, number>
}

export const PREFS_KEY = 'storm-chasers.notify.v1'
export const SEEN_TTL_MS = 48 * 60 * 60 * 1000

export const DEFAULT_PREFS: NotifyPrefs = { enabled: false, threshold: 'WATCHES', permission: 'default', seen: {} }

const PERMISSIONS: PermissionState[] = ['granted', 'denied', 'default']

/** Drops seen entries older than the 48 h window. */
export function pruneSeen(seen: Record<string, number>, now: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, at] of Object.entries(seen)) if (now - at < SEEN_TTL_MS) out[key] = at
  return out
}

/** Parses the stored value, keeping only well-formed fields. Anything unreadable gives the defaults. */
export function parsePrefs(raw: string | null, now: number): NotifyPrefs {
  if (!raw) return { ...DEFAULT_PREFS, seen: {} }
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof NotifyPrefs, unknown>>
    const seen: Record<string, number> = {}
    if (p.seen && typeof p.seen === 'object') {
      for (const [key, at] of Object.entries(p.seen)) if (typeof at === 'number') seen[key] = at
    }
    return {
      enabled: p.enabled === true,
      threshold: THRESHOLDS.includes(p.threshold as Threshold) ? (p.threshold as Threshold) : DEFAULT_PREFS.threshold,
      permission: PERMISSIONS.includes(p.permission as PermissionState)
        ? (p.permission as PermissionState)
        : DEFAULT_PREFS.permission,
      seen: pruneSeen(seen, now),
    }
  } catch {
    return { ...DEFAULT_PREFS, seen: {} }
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(PREFS_KEY)
  } catch {
    return null
  }
}

function writeStorage(prefs: NotifyPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage full or blocked: the prefs still work for this session.
  }
}

let cache: NotifyPrefs = parsePrefs(readStorage(), Date.now())
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getPrefs(): NotifyPrefs {
  return cache
}

export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Live preferences for React (stable snapshot between changes). */
export function usePrefs(): NotifyPrefs {
  return useSyncExternalStore(subscribePrefs, getPrefs)
}

/** Merges a patch, saves it and notifies subscribers. */
export function updatePrefs(patch: Partial<NotifyPrefs>): void {
  const next = { ...cache, ...patch }
  cache = { ...next, seen: pruneSeen(next.seen, Date.now()) }
  writeStorage(cache)
  emit()
}

/** Re-reads storage (used after an external change, and by tests). */
export function reloadPrefs(): void {
  cache = parsePrefs(readStorage(), Date.now())
  emit()
}

/** Remembers a handled key. */
export function markSeen(key: string, now: number): void {
  updatePrefs({ seen: { ...cache.seen, [key]: now } })
}

export function hasSeen(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(cache.seen, key)
}

/** Position of an event on the threshold scale (0 = TOR), or -1 when no step includes it. */
export function eventRank(event: Pick<NotifyEvent, 'kind' | 'level'>): number {
  switch (event.kind) {
    case 'nws-alert':
      if (event.level === 'TOR') return 0
      if (event.level === 'SVR' || event.level === 'FFW') return 1
      if (event.level === 'TOA' || event.level === 'SVA') return 2
      return -1
    case 'spc-watch':
    case 'spc-md':
      return 2
    case 'spc-risk':
      return 3
    case 'chaser-live':
      return 4
  }
}

const RANK_OF_THRESHOLD: Record<Threshold, number> = { TOR: 0, WARNINGS: 1, WATCHES: 2, RISK: 3, CHASERS: 4 }

/** True when the event is at or below the chosen step. */
export function passesThreshold(event: Pick<NotifyEvent, 'kind' | 'level'>, threshold: Threshold): boolean {
  const rank = eventRank(event)
  return rank >= 0 && rank <= RANK_OF_THRESHOLD[threshold]
}
