import type { Ref } from 'react'
import { Badge } from './Badge'
import { formatRemaining } from './format'
import './css/toast.css'

export interface ToastProps {
  /** Tornado Emergency (catastrophic damage threat): adds an EMERGENCY line under the TOR chip. */
  emergency?: boolean
  /** Particularly dangerous situation: white inset ring on the chip and a PDS badge. */
  pds?: boolean
  /** Issue time, UTC label such as `21:46Z`. */
  issued: string
  /** NWS event name, e.g. "Tornado Warning". */
  title: string
  /** Affected area, e.g. "Moore, OK". */
  area: string
  /** Time left until expiry in ms, shown as `T-mm:ss`. Null when the alert has no expiry. */
  remainingMs: number | null
  /** Expiry time, UTC label such as `22:09Z`, shown before the countdown. */
  until?: string | null
  /** Moves the map to the warning. Omit to show the button disabled (no polygon to fly to). */
  onFocus?: () => void
  onDismiss: () => void
  /** Ref for the FOCUS MAP button, so the region can move focus to a new toast. */
  focusRef?: Ref<HTMLButtonElement>
}

/**
 * New-tornado-warning toast (INFLOW v1 §6). Affordance: FOCUS MAP is the primary solid-accent action,
 * DISMISS is quiet. Signifier: the red TOR chip and the NEW IN AOI line. Feedback: 240 ms arrive, then
 * 3 × 1 Hz outline; under reduced motion it stays in place with a static double outline.
 * role="alert" announces it without moving focus.
 */
export function Toast({
  emergency,
  pds,
  issued,
  title,
  area,
  remainingMs,
  until,
  onFocus,
  onDismiss,
  focusRef,
}: ToastProps) {
  const countdown = remainingMs === null ? 'NO EXPIRY' : formatRemaining(remainingMs)
  return (
    <div role="alert" className={pds ? 'toast toast-pds' : 'toast'}>
      <div className="toast-chip">
        <span className="toast-glyph" aria-hidden="true">▼</span>
        <span className="toast-code">TOR</span>
        {emergency && <span className="toast-emergency">EMERGENCY</span>}
      </div>
      <div className="toast-body">
        <div className="toast-meta">
          <span className="toast-new">NEW IN AOI</span>
          <span>· SOURCE NWS</span>
          <span className="toast-spacer" />
          <span className="toast-issued">ISSUED {issued}</span>
        </div>
        <div className="toast-title">
          <strong>{title}</strong>
          {pds && <Badge variant="pds" />}
          <span className="toast-area">{area}</span>
        </div>
        <div className="toast-row">
          <span className="toast-countdown">
            {until ? `until ${until} · ` : ''}
            {countdown}
          </span>
          <span className="toast-spacer" />
          <button
            ref={focusRef}
            type="button"
            className="toast-btn toast-btn-primary"
            onClick={onFocus}
            disabled={!onFocus}
          >
            ⌖ FOCUS MAP
          </button>
          <button type="button" className="toast-btn toast-btn-quiet" onClick={onDismiss}>
            DISMISS ✕
          </button>
        </div>
      </div>
    </div>
  )
}
