import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Abbr, ConsoleButton } from '../ui'
import { clearNotifyCount, useNotifyRuntime } from './engine'
import { getPrefs, THRESHOLDS, updatePrefs, usePrefs, type PermissionState, type Threshold } from './prefs'
import './notify.css'

// Top-bar notification control (ADR-0019).
// Affordance: press to open the settings popover; the enable box asks for permission, only ever from a click.
// Signifier: an outlined console button that names its state (NOTIFY OFF / ON / BLOCKED / UNSUPPORTED).
// Feedback: the label and the pressed state follow the browser's permission; the popover shows the in-app count.
// Escape closes the popover and returns focus to the button.

const THRESHOLD_LABELS: Record<Threshold, ReactNode> = {
  TOR: 'Tornado warnings only',
  WARNINGS: 'Plus severe thunderstorm and flash flood warnings',
  WATCHES: 'Plus watches and mesoscale discussions',
  RISK: (
    <>
      Plus <Abbr term="SPC" /> risk upgrades
    </>
  ),
  CHASERS: 'Plus chasers going live',
}

type Status = 'off' | 'on' | 'blocked' | 'unsupported'

const BUTTON_LABEL: Record<Status, string> = {
  off: 'NOTIFY OFF',
  on: 'NOTIFY ON',
  blocked: 'NOTIFY BLOCKED',
  unsupported: 'NOTIFY UNSUPPORTED',
}

/** The browser's permission right now, or null when there is no Notification API. Read-only: never prompts. */
function browserPermission(): PermissionState | null {
  if (typeof Notification === 'undefined') return null
  return Notification.permission
}

/** Asks for permission. Only called from a click handler (Chrome, Firefox and Safari require a user gesture). */
function askPermission(): void {
  if (typeof Notification === 'undefined') return
  try {
    void Promise.resolve(Notification.requestPermission()).then(
      (result) => updatePrefs({ permission: result }),
      () => updatePrefs({ permission: 'default' }),
    )
  } catch {
    updatePrefs({ permission: 'default' })
  }
}

function statusOf(enabled: boolean, permission: PermissionState, unsupported: boolean): Status {
  if (!enabled) return 'off'
  if (unsupported) return 'unsupported'
  if (permission === 'denied') return 'blocked'
  if (permission === 'granted') return 'on'
  return 'off'
}

export function NotifyControl() {
  const prefs = usePrefs()
  const runtime = useNotifyRuntime()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const firstRef = useRef<HTMLInputElement | null>(null)
  const dialogId = useId()
  const groupName = useId()

  // Refresh the stored permission once per load (a read, never a prompt), so a change made in browser settings shows.
  useEffect(() => {
    const live = browserPermission()
    if (live !== null && live !== getPrefs().permission) updatePrefs({ permission: live })
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

  const unsupported = runtime.unsupported || browserPermission() === null
  const status = statusOf(prefs.enabled, prefs.permission, unsupported)
  const count = runtime.count

  const close = () => {
    clearNotifyCount()
    setOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('.notify-btn')?.focus()
  }

  // A box that is ticked on and not yet allowed (the first prompt was dismissed) needs a visible way to ask again.
  const setEnabled = (on: boolean) => {
    if (!on) {
      updatePrefs({ enabled: false })
      return
    }
    updatePrefs({ enabled: true })
    if (browserPermission() === 'default') askPermission()
  }

  return (
    <span className="notify" ref={rootRef}>
      <ConsoleButton
        className="notify-btn"
        pressed={status === 'on'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {BUTTON_LABEL[status]}
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
          <label className="notify-row">
            <input
              ref={firstRef}
              type="checkbox"
              checked={prefs.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Notify me while this tab is open</span>
          </label>

          {status === 'unsupported' && (
            <p className="notify-status" role="status">
              NOT SUPPORTED ON THIS BROWSER. The count still works.
            </p>
          )}
          {status === 'blocked' && (
            <p className="notify-status" role="status">
              BLOCKED IN BROWSER. Allow notifications for this site in the browser’s site settings, then reopen this
              panel.
            </p>
          )}
          {prefs.enabled && status === 'off' && browserPermission() === 'default' && (
            <div className="notify-status" role="status">
              <span>Permission not granted yet.</span>
              <ConsoleButton className="notify-allow" onClick={askPermission}>
                ALLOW NOTIFICATIONS
              </ConsoleButton>
            </div>
          )}

          <fieldset className="notify-fieldset">
            <legend>Notify me about</legend>
            {THRESHOLDS.map((t) => (
              <label key={t} className="notify-row">
                <input
                  type="radio"
                  name={groupName}
                  value={t}
                  checked={prefs.threshold === t}
                  onChange={() => updatePrefs({ threshold: t })}
                />
                <span>{THRESHOLD_LABELS[t]}</span>
              </label>
            ))}
          </fieldset>

          <p className="notify-count">
            <strong>{count}</strong> NEW
          </p>
          <p className="notify-note">
            Only while this tab is open, including in the background. Closed tabs get nothing (v2).
          </p>
        </div>
      )}
    </span>
  )
}
