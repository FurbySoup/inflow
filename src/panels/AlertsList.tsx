import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import { Panel } from './Panel'
import { queryStatus } from '../lib/feedStatus'

const SEVERITY_RANK = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

export function AlertsList() {
  const states = useAoi((s) => s.states)
  const query = useSource(nwsAlerts)

  const visible = (query.data ?? [])
    .filter((a) => a.states.some((s) => states.includes(s)))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  return (
    <Panel code="WX-02" title="NWS Alerts" status={queryStatus(query)} meta={visible.length}>
      {query.isError && <p className="error">NWS alerts unavailable</p>}
      <ul className="alerts">
        {visible.map((a) => (
          <li key={a.id} className={`sev-${a.severity.toLowerCase()}`}>
            <strong>{a.event.toUpperCase()}</strong>
            <span className="muted">{a.areaDesc}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
