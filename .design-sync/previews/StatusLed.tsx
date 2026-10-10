import { StatusLed } from 'storm-chasers'

const label = { fontFamily: 'var(--font-data)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--text)' } as const
const row = { display: 'flex', alignItems: 'center', gap: 8 } as const

/** Every feed-health state with its meaning. */
export const AllStates = () => (
  <div style={{ display: 'grid', gap: 10, padding: 14, background: 'var(--panel-head)', width: 260 }}>
    <span style={row}><StatusLed status="live" /><span style={label}>LIVE — FEED UPDATING</span></span>
    <span style={row}><StatusLed status="loading" /><span style={label}>LOADING — FIRST FETCH</span></span>
    <span style={row}><StatusLed status="stale" /><span style={label}>STALE — LAST UPDATE OLD</span></span>
    <span style={row}><StatusLed status="error" /><span style={label}>ERROR — UPSTREAM FAILED</span></span>
    <span style={row}><StatusLed status="offline" /><span style={label}>OFFLINE — NO COVERAGE</span></span>
  </div>
)

/** As used in a panel header row. */
export const InHeader = () => (
  <div style={{ ...row, padding: '6px 10px', background: 'var(--panel-head)', border: '1px solid var(--border)', width: 260 }}>
    <StatusLed status="live" />
    <span className="panel-code">WX-02</span>
    <span style={{ ...label, fontWeight: 600, letterSpacing: '0.14em' }}>NWS ALERTS</span>
  </div>
)
