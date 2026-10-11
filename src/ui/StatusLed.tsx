export type FeedStatus = 'live' | 'stale' | 'error' | 'offline' | 'loading'

export interface StatusLedProps {
  /** Feed health. The shape carries the state, colour is secondary: ● live, ◌ loading, ◐ stale, ■ error, ○ offline. */
  status: FeedStatus
  /** Data age as shown in the panel header, e.g. `12s` or `4m05s`. Only read out, never drawn here. */
  age?: string
}

/**
 * Feed-health indicator light shown in every panel header. Read-only (no hover, no border); the shape is drawn in
 * led.css from `data-status`. The live halo and loading spin are disabled under reduced motion.
 */
export function StatusLed({ status, age }: StatusLedProps) {
  const label = age ? `${status}, updated ${age} ago` : status
  return <span className="led" data-status={status} role="img" aria-label={label} />
}
