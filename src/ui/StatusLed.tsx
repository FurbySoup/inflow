export type FeedStatus = 'live' | 'stale' | 'error' | 'offline' | 'loading'

export interface StatusLedProps {
  /** Feed health: `live` pulses green, `loading` pulses accent, `stale` amber, `error` red, `offline` grey. */
  status: FeedStatus
}

/** Feed-health indicator light shown in every panel header. Pulses are disabled under reduced motion. */
export function StatusLed({ status }: StatusLedProps) {
  return <span className={`led led-${status}`} role="img" aria-label={status} />
}
