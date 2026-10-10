import { AlertList, AlertRow, Panel } from 'storm-chasers'

const frame = { width: 360, height: 240, display: 'flex', flexDirection: 'column' } as const

/** Canonical panel: live LED, code, title, count meta, collapse toggle, scrolling body. */
export const AlertsPanel = () => (
  <div style={frame}>
    <Panel code="WX-02" title="NWS Alerts" status="live" meta={3} collapsible onToggleCollapse={() => {}}>
      <AlertList>
        <AlertRow event="Tornado Warning" area="Jefferson, GA" severity="Extreme" remainingMs={542_000} onSelect={() => {}} />
        <AlertRow event="Tornado Warning" area="Screven, GA" severity="Extreme" remainingMs={1_302_000} onSelect={() => {}} />
        <AlertRow event="Tornado Watch" area="Burke, GA; Bamberg, SC" severity="Extreme" remainingMs={16_200_000} zone />
      </AlertList>
    </Panel>
  </div>
)

/** Feed-health states in the header LED. */
export const Statuses = () => (
  <div style={{ display: 'grid', gap: 6, width: 360 }}>
    <Panel code="VID-01" title="Chaser Feeds" status="live" meta={13} />
    <Panel code="AUD-01" title="Radio / Scanner" status="loading" />
    <Panel code="SPC-01" title="Storm Reports" status="stale" meta="12m old" />
    <Panel code="CCTV-01" title="DOT Cameras" status="error">
      <p className="error">Camera feeds unavailable</p>
    </Panel>
    <Panel code="SAT-01" title="GOES-East IR" status="offline">
      <p className="muted">SATELLITE FEED OFFLINE</p>
    </Panel>
  </div>
)

/** Collapsed: header shrinks to LED + code + ▸ (title becomes the tooltip). */
export const Collapsed = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    <Panel code="AUD-01" title="Radio / Scanner" status="live" meta="5 RX NEAR" collapsible collapsed onToggleCollapse={() => {}} />
    <Panel code="CCTV-01" title="DOT Cameras" status="offline" collapsible collapsed onToggleCollapse={() => {}} />
  </div>
)
