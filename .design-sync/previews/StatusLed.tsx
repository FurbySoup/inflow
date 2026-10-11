import { StatusLed } from 'storm-chasers'

const label = { fontFamily: 'var(--font-data)', fontSize: 'var(--fs-data-xs)', letterSpacing: 'var(--tr-code)', color: 'var(--text-primary)' } as const
const row = { display: 'flex', alignItems: 'center', gap: 8 } as const

/** Every feed-health state with its shape and meaning. Shapes stay distinct in greyscale. */
export const AllStates = () => (
  <div style={{ display: 'grid', gap: 10, padding: 14, background: 'var(--surface-head)', width: 280 }}>
    <span style={row}><StatusLed status="live" /><span style={label}>● LIVE — FEED UPDATING</span></span>
    <span style={row}><StatusLed status="loading" /><span style={label}>◌ LOADING — FIRST FETCH</span></span>
    <span style={row}><StatusLed status="stale" /><span style={label}>◐ STALE — LAST UPDATE OLD</span></span>
    <span style={row}><StatusLed status="error" /><span style={label}>■ ERROR — UPSTREAM FAILED</span></span>
    <span style={row}><StatusLed status="offline" /><span style={label}>○ OFFLINE — NO COVERAGE</span></span>
  </div>
)

/** With the data age read out to assistive tech (aria-label carries the age; nothing is drawn). */
export const WithAge = () => (
  <div style={{ display: 'grid', gap: 10, padding: 14, background: 'var(--surface-head)', width: 280 }}>
    <span style={row}><StatusLed status="live" age="12s" /><span style={label}>● LIVE · 12s</span></span>
    <span style={row}><StatusLed status="stale" age="4m05s" /><span style={label}>◐ STALE · 4m05s</span></span>
  </div>
)
