import { useEffect, useRef, useState } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { Panel } from './Panel'
import { queryStatus } from '../lib/feedStatus'
import { geometryBbox, isEmergencyWarning, remainingMs } from './alertGeometry'
import { AlertList, AlertRow } from '../ui'

const SEVERITY_RANK = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

export function AlertsList() {
  const states = useAoi((s) => s.states)
  const focus = useAoi((s) => s.focus)
  const setFocus = useAoi((s) => s.setFocus)
  const query = useSource(nwsAlerts)
  const [now, setNow] = useState(() => Date.now())
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!focus) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-alert-id="${CSS.escape(focus.id)}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [focus])

  const visible = (query.data ?? [])
    .filter((a) => a.states.some((s) => states.includes(s)))
    .filter((a) => {
      const left = remainingMs(a.expires, now)
      return left === null || left > 0
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  const select = (a: Alert) => {
    const bbox = geometryBbox(a.geometry)
    if (bbox) setFocus({ id: a.id, bbox })
  }

  return (
    <Panel collapsible code="WX-02" title="NWS Alerts" status={queryStatus(query)} meta={visible.length}>
      {query.isError && <p className="error">NWS alerts unavailable</p>}
      <AlertList ref={listRef}>
        {visible.map((a) => (
          <AlertRow
            key={a.id}
            alertId={a.id}
            event={a.event}
            area={a.areaDesc}
            severity={a.severity}
            remainingMs={remainingMs(a.expires, now)}
            zone={a.geometry === null}
            selected={focus?.id === a.id}
            emergency={isEmergencyWarning(a.event, a.headline)}
            onSelect={() => select(a)}
          />
        ))}
      </AlertList>
    </Panel>
  )
}

