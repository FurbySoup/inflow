/* eslint-disable react-refresh/only-export-components -- pure time formatters sit beside the row that uses them; format.ts is orchestrator-owned */
import type { ReactNode, Ref } from 'react'
import { hazardCode, isWatch, type HazardCode } from './hazard'
import { Abbr } from './Abbr'
import { GLOSSARY } from './glossary'

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'

const LOW_TIME_MS = 10 * 60_000
const HOUR_MS = 3_600_000

const GLYPH: Record<HazardCode, string> = { TOR: '▼', SVR: '◆', FFW: '≋', TOA: '▽', SVA: '◇', SPS: '○', OTHER: '·' }

const pad2 = (n: number) => String(n).padStart(2, '0')

/** `T-mm:ss`, or `T-h:mm:ss` from one hour. Clamped at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return ms >= HOUR_MS ? `T-${h}:${pad2(mm)}:${pad2(ss)}` : `T-${pad2(mm)}:${pad2(ss)}`
}

/** Share of the alert's onset→expires window still remaining, clamped to 0..1. Null when the window is unknown. */
export function remainingFraction(remainingMs: number, durationMs: number | null | undefined): number | null {
  if (!durationMs || durationMs <= 0) return null
  return Math.min(1, Math.max(0, remainingMs / durationMs))
}

/** `HH:mm:ssZ` in UTC for an epoch ms, or `--:--:--Z` when unknown. */
export function formatZulu(ms: number | null | undefined): string {
  if (!ms) return '--:--:--Z'
  const d = new Date(ms)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`
}

/** Feed failure above the rows. Rows stay visible at 72% as last known; a failed feed must never read as "no warnings". */
export interface AlertFeedError {
  /** Epoch ms of the last successful fetch; null if the feed has never succeeded. */
  lastGood: number | null
  /** A retry is in flight: the button reads `◌ LOADING`. */
  retrying: boolean
  onRetry: () => void
}

/** Shown in place of the rows when the feed is fine but nothing is active. */
export interface AlertEmpty {
  /** Uppercase label, e.g. "NO ACTIVE ALERTS IN AOI". */
  label: string
  /** One sentence of context. */
  note: string
}

export interface AlertListProps {
  children?: ReactNode
  ref?: Ref<HTMLUListElement>
  feedError?: AlertFeedError | null
  empty?: AlertEmpty | null
}

/** Container for AlertRow items with the optional feed-error banner and empty state. */
export function AlertList({ children, ref, feedError, empty }: AlertListProps) {
  return (
    <div className="alert-list">
      {feedError && <FeedErrorBanner {...feedError} />}
      <ul className="alerts" ref={ref}>
        {children}
      </ul>
      {empty && (
        <div className="alert-empty">
          <span className="alert-empty-label">{empty.label}</span>
          <span className="alert-empty-note">{empty.note}</span>
        </div>
      )}
    </div>
  )
}

function FeedErrorBanner({ lastGood, retrying, onRetry }: AlertFeedError) {
  return (
    <div className="alert-banner" role="alert">
      <span className="alert-banner-title">
        <span className="alert-banner-mark" aria-hidden="true" />
        NWS FEED ERROR · WARNINGS MAY BE MISSING
      </span>
      <span className="alert-banner-note">
        {lastGood === null ? 'No successful update yet.' : `Last good ${formatZulu(lastGood)}. Rows below are last known.`}
      </span>
      <span className="alert-banner-actions">
        <button type="button" className="alert-retry" onClick={onRetry} disabled={retrying}>
          {retrying ? '◌ LOADING' : 'RETRY ↻'}
        </button>
        <a className="alert-weathergov" href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">
          WEATHER.GOV ↗
        </a>
      </span>
    </div>
  )
}

export interface AlertRowProps {
  /** NWS event name, e.g. "Tornado Warning". Also classifies the hazard chip via ./hazard.ts. */
  event: string
  /** Affected area description, e.g. "Screven, GA". */
  area: string
  /** Kept for compatibility and exposed as `data-severity`; the chip is classified by `event`. */
  severity: AlertSeverity
  /** Time left until expiry in ms. Negative once expired (the row shows as expired). Omit/null for no countdown. */
  remainingMs?: number | null
  /** Onset→expires window in ms; drives the remaining-time bar. Omit/null for no bar. */
  durationMs?: number | null
  /** Zone-based alert without a polygon: shows a ZONE badge and is not clickable. */
  zone?: boolean
  /** Focused alert: accent background, accent outline, filled ⌖ box. */
  selected?: boolean
  /** PDS / emergency: flashing outline (static under reduced motion), PDS badge and chip ring. */
  emergency?: boolean
  /** Last-known row shown while the feed is in error (72% opacity). */
  degraded?: boolean
  /** Makes the row a keyboard-accessible button (ignored for zone alerts). */
  onSelect?: () => void
  /** Optional id written to `data-alert-id` for scroll-into-view lookups. */
  alertId?: string
}

/**
 * One NWS alert: hazard chip (glyph + code), event and area, ZONE badge or ⌖ box, countdown and remaining-time bar.
 * Clickable rows (polygon alerts with onSelect) are buttons with a persistent ⌖ signifier; the chip is read-only.
 * Must be rendered inside AlertList.
 */
export function AlertRow({
  event,
  area,
  severity,
  remainingMs,
  durationMs,
  zone,
  selected,
  emergency,
  degraded,
  onSelect,
  alertId,
}: AlertRowProps) {
  const code = hazardCode(event)
  const watch = isWatch(event)
  const clickable = !zone && onSelect !== undefined
  const hasCountdown = remainingMs !== undefined && remainingMs !== null
  const expired = hasCountdown && remainingMs <= 0
  const low = hasCountdown && !watch && remainingMs < LOW_TIME_MS
  const fraction = hasCountdown ? remainingFraction(remainingMs, durationMs) : null

  // State classes sit on the listitem (outline, opacity); the inner element is the interactive row.
  const itemClasses = [
    'alert-item',
    selected && 'alert-selected',
    emergency && 'alert-emergency',
    expired && 'alert-expired',
    degraded && 'alert-degraded',
  ]
    .filter(Boolean)
    .join(' ')
  const rowClasses = ['alert-row', clickable && 'alert-clickable'].filter(Boolean).join(' ')
  const chipClasses = ['alert-chip', watch ? 'alert-chip-watch' : 'alert-chip-warning', emergency && 'alert-chip-pds']
    .filter(Boolean)
    .join(' ')

  return (
    <li data-alert-id={alertId} data-hz={code} data-severity={severity.toLowerCase()} className={itemClasses}>
      <div
        className={rowClasses}
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
        <span className={chipClasses} data-hz={code}>
          <span className="alert-glyph" aria-hidden="true">
            {GLYPH[code]}
          </span>
          <Abbr term={code} />
        </span>
        <span className="alert-main">
          <span className="alert-line">
            <span className="alert-event">{event}</span>
            {emergency && (
              <span className="alert-pds">
                <Abbr term="PDS" />
              </span>
            )}
          </span>
          <span className="alert-area">{area}</span>
        </span>
        <span className="alert-slot">
          {zone && (
            <span className="alert-zone">
              <Abbr term="ZONE" />
            </span>
          )}
          {clickable && (
            <span className="alert-target" aria-hidden="true">
              ⌖
            </span>
          )}
        </span>
        {hasCountdown && (
          <span className={low ? 'alert-time alert-time-low' : 'alert-time'}>
            <span className="alert-count" title={GLOSSARY['T-']}>
              {formatCountdown(remainingMs)}
            </span>
            {fraction !== null && (
              <span className="alert-bar" aria-hidden="true">
                <span className="alert-bar-fill" style={{ width: `${fraction * 100}%` }} />
              </span>
            )}
          </span>
        )}
      </div>
    </li>
  )
}
