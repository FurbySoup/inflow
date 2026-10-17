import { useEffect, useId, useRef, useState } from 'react'
import { useAoi } from '../state/aoi'
import { ConsoleButton, TaggedText } from '../ui'
import { clearNotifyCount, sendTestNotification, useNotifyRuntime } from './engine'
import {
  areaLine,
  BLOCKED,
  countLine,
  LIMITS,
  NOTIFY_BUTTON_TITLE,
  NOTIFY_LABEL,
  POPOVER_HEADING,
  STATE_LINE,
  TEST_BUTTON,
  TEST_RESULT,
  THRESHOLD_COPY,
  THRESHOLD_LEGEND,
  TOGGLE_LABEL,
  UNAVAILABLE,
} from './notifyCopy'
import { getPrefs, THRESHOLDS, updatePrefs, usePrefs, type PermissionState } from './prefs'
import { browserFamily, setupState, unavailableReason, type SetupState, type UnavailableReason } from './setupState'
import './notify.css'

// Top-bar notification control (ADR-0019, ADR-0022).
// Affordance: press to open the settings popover; the enable box asks for permission, only ever from a click.
// Signifier: an outlined console button that names its state (NOTIFY OFF / ON / BLOCKED / N/A).
// Feedback: the label and the pressed state follow the browser's permission; SEND TEST proves the browser shows one.
// Escape closes the popover and returns focus to the button.

/** After this long in the pending state the popover offers the "no prompt?" hint. */
const PENDING_QUIET_MS = 3_000
const MAX_AOI_CODES = 6

/** The AOI states as the top bar shows them: the first six, then +N. Re-done here so the control doesn't import Topbar. */
function aoiText(states: string[]): string {
  if (states.length === 0) return '—'
  const shown = states.slice(0, MAX_AOI_CODES).join(' · ')
  return states.length > MAX_AOI_CODES ? `${shown} +${states.length - MAX_AOI_CODES}` : shown
}

/** The browser's permission right now, or null when there is no Notification API. Read-only: never prompts. */
function browserPermission(): PermissionState | null {
  if (typeof Notification === 'undefined') return null
  return Notification.permission
}

/** Copies the browser's live permission into prefs when it differs. Read-only: never prompts. */
function syncPermission(): void {
  const live = browserPermission()
  if (live !== null && live !== getPrefs().permission) updatePrefs({ permission: live })
}

/**
 * Asks for permission. Only called from a click handler (Chrome, Firefox and Safari require a user gesture).
 * `onSettled` always runs once: with the answer, or 'default' when the browser can't ask or the request fails.
 */
function askPermission(onSettled: (result: PermissionState) => void): void {
  const settle = (result: NotificationPermission | undefined) => {
    // Old callback-style implementations resolve undefined: treat that as not decided.
    const next = result ?? 'default'
    updatePrefs({ permission: next })
    onSettled(next)
  }
  if (typeof Notification === 'undefined') {
    onSettled('default')
    return
  }
  try {
    void Promise.resolve(Notification.requestPermission()).then(settle, () => settle(undefined))
  } catch {
    settle(undefined)
  }
}

/** Browser facts the setup state is built from. Read at render time; `navigator` and `isSecureContext` are globals. */
function userAgent(): string {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent
}

function isSecure(): boolean {
  // A missing flag (very old browser) is treated as secure rather than naming a cause we can't see.
  return globalThis.isSecureContext !== false
}

type TestResult = 'shown' | 'refused'

interface SetupBlockProps {
  state: SetupState
  reason: UnavailableReason | null
  ua: string
  quiet: boolean
  testResult: TestResult | null
  onAllow(): void
  onTest(): void
}

/** The state-specific lines under the toggle: one fix per state, plus the SEND TEST result. */
function SetupBlock({ state, reason, ua, quiet, testResult, onAllow, onTest }: SetupBlockProps) {
  if (reason !== null) {
    return (
      <div className="notify-state">
        <p className="notify-status" role="status">
          {UNAVAILABLE[reason]}
        </p>
        {testResult && <p className="notify-test-line" role="status">{TEST_RESULT[testResult]}</p>}
      </div>
    )
  }
  if (state === 'blocked') {
    return (
      <div className="notify-state">
        <p className="notify-status" role="status">
          {BLOCKED.head}
        </p>
        <p>{BLOCKED[browserFamily(ua)]}</p>
        <p>{BLOCKED.stuck}</p>
      </div>
    )
  }
  if (state === 'pending') {
    return (
      <div className="notify-state">
        <div className="notify-status" role="status">
          <span>{STATE_LINE.pending}</span>
          <ConsoleButton className="notify-allow" onClick={onAllow}>
            ALLOW NOTIFICATIONS
          </ConsoleButton>
        </div>
        {quiet && <p className="notify-hint">{STATE_LINE.pendingQuiet}</p>}
      </div>
    )
  }
  if (state === 'on') {
    return (
      <div className="notify-state">
        <p>{STATE_LINE.on}</p>
        <div className="notify-status">
          <ConsoleButton className="notify-test" onClick={onTest}>
            {TEST_BUTTON}
          </ConsoleButton>
        </div>
        {testResult && <p className="notify-test-line" role="status">{TEST_RESULT[testResult]}</p>}
      </div>
    )
  }
  return (
    <div className="notify-state">
      <p>{STATE_LINE.off}</p>
    </div>
  )
}

export function NotifyControl() {
  const prefs = usePrefs()
  const runtime = useNotifyRuntime()
  const aoiStates = useAoi((s) => s.states)
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const firstRef = useRef<HTMLInputElement | null>(null)
  const dialogId = useId()
  const groupName = useId()

  // Mount: a change made in browser settings while the app was closed shows up.
  useEffect(() => {
    syncPermission()
  }, [])

  // Opening: the user may have just come back from the browser's site settings.
  useEffect(() => {
    if (open) syncPermission()
  }, [open])

  // Tab visible again: the user may have changed the permission on another page and returned here.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncPermission()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!open) return
    firstRef.current?.focus()
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        clearNotifyCount()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const ua = userAgent()
  // The browser has no usable API once the constructor has thrown (SEND TEST refused), so the reason is that.
  const reason = unavailableReason({
    hasApi: typeof Notification !== 'undefined' && !runtime.unsupported,
    secure: isSecure(),
    userAgent: ua,
  })
  const state = setupState({
    enabled: prefs.enabled,
    permission: prefs.permission,
    reason,
    pending: asking,
  })
  const count = runtime.count

  // Ticked and still undecided: after a short wait, say where the prompt may have gone.
  useEffect(() => {
    if (!open || state !== 'pending') return
    const timer = setTimeout(() => setQuiet(true), PENDING_QUIET_MS)
    return () => clearTimeout(timer)
  }, [open, state])

  const close = () => {
    clearNotifyCount()
    setOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('.notify-btn')?.focus()
  }

  const toggleOpen = () => {
    if (open) {
      close()
      return
    }
    setQuiet(false)
    setTestResult(null)
    setOpen(true)
  }

  const askNow = () => {
    setAsking(true)
    askPermission((result) => {
      setAsking(false)
      if (result === 'default') setQuiet(true)
    })
  }

  const runTest = () => {
    setTestResult(sendTestNotification())
  }

  // A box that is ticked on and not yet allowed (the first prompt was dismissed) needs a visible way to ask again.
  const setEnabled = (on: boolean) => {
    if (!on) {
      updatePrefs({ enabled: false })
      return
    }
    updatePrefs({ enabled: true })
    if (browserPermission() === 'default') askNow()
  }

  return (
    <span className="notify" ref={rootRef}>
      <ConsoleButton
        className="notify-btn"
        title={NOTIFY_BUTTON_TITLE}
        pressed={state === 'on'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={toggleOpen}
      >
        {NOTIFY_LABEL[state]}
        {count > 0 && ` · ${count} NEW`}
      </ConsoleButton>
      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Notification settings"
          className="notify-pop"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          }}
        >
          <h2 className="notify-heading">{POPOVER_HEADING}</h2>
          <p className="notify-area">{areaLine(aoiText(aoiStates))}</p>

          <label className="notify-row">
            <input
              ref={firstRef}
              type="checkbox"
              checked={prefs.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>{TOGGLE_LABEL}</span>
          </label>

          <SetupBlock
            state={state}
            reason={reason}
            ua={ua}
            quiet={quiet}
            testResult={testResult}
            onAllow={askNow}
            onTest={runTest}
          />

          <fieldset className="notify-fieldset">
            <legend>{THRESHOLD_LEGEND}</legend>
            {THRESHOLDS.map((t) => (
              <label key={t} className="notify-row">
                <input
                  type="radio"
                  name={groupName}
                  value={t}
                  checked={prefs.threshold === t}
                  onChange={() => updatePrefs({ threshold: t })}
                />
                <span>
                  <TaggedText text={THRESHOLD_COPY[t].label} />
                  <span className="notify-hint">
                    <TaggedText text={THRESHOLD_COPY[t].hint} />
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="notify-count">{countLine(count)}</p>
          <p className="notify-note">{LIMITS}</p>
        </div>
      )}
    </span>
  )
}
