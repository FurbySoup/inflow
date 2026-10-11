import { useEffect, useState, useSyncExternalStore } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import { isLayerOn, subscribeLayers, toggleLayer } from '../map/LayerControl'
import { ConsoleButton, formatRemaining } from '../ui'
import { geometryBbox } from './alertGeometry'
import { threatSummary } from './threat'
import './threat.css'

// Top-bar threat button (INFLOW v1 §5): the most severe tornado warning in the AOI stays one press away.
// Affordance: focus the map on the most severe TOR. Signifier: the boxed ⌖ glyph, always visible.
// Feedback: the map flies to and outlines it (MapPanel). Read-only when there are none (ADR-0012).
// Look lives in ./threat.css (threat-*, warnings-chip classes), tokens only.

/** Live count of tornado warnings in the AOI, the most severe one as the focus target. */
export function ThreatButton() {
  const states = useAoi((s) => s.states)
  const setFocus = useAoi((s) => s.setFocus)
  const query = useSource(nwsAlerts)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // A failed feed with no last-good data must not read as "no warnings" (INFLOW v1 §10).
  if (query.isError && !query.data) {
    return <span className="threat-none">■ NWS ALERTS UNAVAILABLE</span>
  }
  if (query.isPending) {
    return <span className="threat-none">◌ LOADING</span>
  }

  const summary = threatSummary(query.data ?? [], states, now)
  if (summary.count === 0) {
    return <span className="threat-none">NO TORNADO WARNINGS</span>
  }

  const { count, pdsCount, nextExpiryMs, target } = summary
  const press = () => {
    if (!target) return
    const bbox = geometryBbox(target.geometry)
    if (bbox) setFocus({ id: target.id, bbox })
  }

  return (
    <ConsoleButton className="threat-btn" onClick={press} aria-label="Focus most severe tornado warning">
      <span aria-hidden="true">▼</span>
      <span className="threat-full">
        {count} TORNADO WARNING{count > 1 ? 'S' : ''}
      </span>
      <span className="threat-short">{count} TOR</span>
      {pdsCount > 0 && <span className="threat-pds">· {pdsCount} PDS</span>}
      {nextExpiryMs !== null && (
        <span className="threat-next">
          <span className="threat-next-label">NEXT EXP </span>
          {formatRemaining(nextExpiryMs)}
        </span>
      )}
      <span className="threat-glyph" aria-hidden="true">
        ⌖
      </span>
    </ConsoleButton>
  )
}

/** Shown while the NWS Alerts layer is off, so hidden warnings are never silently missing. Press restores the layer. */
export function WarningsHiddenChip() {
  const alertsOn = useSyncExternalStore(subscribeLayers, () => isLayerOn('alerts'))
  if (alertsOn) return null
  return (
    <ConsoleButton className="warnings-chip" onClick={() => toggleLayer('alerts')} aria-label="Show NWS warnings layer">
      WARNINGS HIDDEN
      <span aria-hidden="true">▸ SHOW</span>
    </ConsoleButton>
  )
}
