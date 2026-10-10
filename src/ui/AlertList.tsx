import type { ReactNode, Ref } from 'react'
import { Badge } from './Badge'
import { formatRemaining } from './format'

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'

const LOW_TIME_MS = 10 * 60_000

export interface AlertListProps {
  children?: ReactNode
  ref?: Ref<HTMLUListElement>
}

/** Container for AlertRow items: unstyled list with monospace data type. */
export function AlertList({ children, ref }: AlertListProps) {
  return (
    <ul className="alerts" ref={ref}>
      {children}
    </ul>
  )
}

export interface AlertRowProps {
  /** NWS event name, e.g. "Tornado Warning" (rendered uppercase). */
  event: string
  /** Affected area description, e.g. "Screven, GA". */
  area: string
  /** Drives the left severity bar: Extreme red, Severe orange, Moderate yellow. */
  severity: AlertSeverity
  /** Time left until expiry in ms; shows a `T-mm:ss` countdown, red under 10 minutes. Omit/null for no countdown. */
  remainingMs?: number | null
  /** Zone-based alert without a polygon: shows a ZONE badge and is not clickable. */
  zone?: boolean
  /** Highlighted with an accent inset bar (the alert the map is focused on). */
  selected?: boolean
  /** PDS / emergency warning: flashing red outline (static under reduced motion) and a PDS badge. */
  emergency?: boolean
  /** Makes the row a keyboard-accessible button (ignored for zone alerts). */
  onSelect?: () => void
  /** Optional id written to `data-alert-id` for scroll-into-view lookups. */
  alertId?: string
}

/** One NWS alert in an AlertList: severity bar, event, badges, countdown and area. Must be rendered inside AlertList. */
export function AlertRow({ event, area, severity, remainingMs, zone, selected, emergency, onSelect, alertId }: AlertRowProps) {
  const clickable = !zone && onSelect !== undefined
  const classes = [`sev-${severity.toLowerCase()}`, selected && 'alert-selected', emergency && 'alert-emergency']
    .filter(Boolean)
    .join(' ')
  const hasCountdown = remainingMs !== undefined && remainingMs !== null

  return (
    <li
      data-alert-id={alertId}
      className={classes}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onSelect : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
    >
      <span className="alert-title">
        <strong>{event.toUpperCase()}</strong>
        {emergency && <Badge variant="pds" />}
        {zone && <Badge variant="zone" />}
        {hasCountdown && (
          <span className={remainingMs < LOW_TIME_MS ? 'alert-countdown alert-countdown-low' : 'alert-countdown'}>
            {formatRemaining(remainingMs)}
          </span>
        )}
      </span>
      <span className="muted">{area}</span>
    </li>
  )
}
