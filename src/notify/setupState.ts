import type { PermissionState } from './prefs'

/**
 * Notification setup state and reason detection (ADR-0022). Pure: the control passes in the live browser facts, so
 * every branch is testable without a browser.
 */

export type UnavailableReason = 'insecure' | 'ios' | 'android' | 'other'

export type SetupState = 'off' | 'pending' | 'on' | 'blocked' | 'unavailable'

export type BrowserFamily = 'firefox' | 'safari' | 'chromium'

export interface UnavailableInput {
  /** The Notification API exists in this browser. */
  hasApi: boolean
  /** `isSecureContext` of the page. */
  secure: boolean
  userAgent: string
}

/**
 * Why notifications can't work here, or null when they can. Order matters: an insecure page is named first, even on
 * Android or with the API present, because the fix for it is different (a LAN http page may still have the API).
 * Android is unavailable up front even when the API exists, because `new Notification` throws there.
 */
export function unavailableReason({ hasApi, secure, userAgent }: UnavailableInput): UnavailableReason | null {
  if (!secure) return 'insecure'
  if (/iPhone|iPad|iPod/.test(userAgent) && !hasApi) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  if (!hasApi) return 'other'
  return null
}

export interface SetupInput {
  enabled: boolean
  permission: PermissionState
  reason: UnavailableReason | null
  /** A permission request is in flight. Does not change the result: an undecided ticked box is `pending` either way. */
  pending: boolean
}

/** The one state the control shows. An unavailable reason wins even over an unticked box, so the bar says N/A up front. */
export function setupState({ enabled, permission, reason }: SetupInput): SetupState {
  if (reason !== null) return 'unavailable'
  if (!enabled) return 'off'
  if (permission === 'denied') return 'blocked'
  if (permission === 'granted') return 'on'
  return 'pending'
}

/** Which browser's path to allow notifications the blocked help line should describe. */
export function browserFamily(userAgent: string): BrowserFamily {
  if (/Firefox|FxiOS/.test(userAgent)) return 'firefox'
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(userAgent)) return 'safari'
  return 'chromium'
}
