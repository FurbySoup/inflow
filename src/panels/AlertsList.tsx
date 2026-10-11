import { useEffect, useRef, useState } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { compareAlerts, isPds } from '../lib/hazards'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { Panel } from './Panel'
import { queryStatus } from '../lib/feedStatus'
import {
  alertDurationMs,
  alertsView,
  formatAge,
  formatZulu,
  geometryBbox,
  isListed,
  remainingMs,
} from './alertGeometry'
import { AlertList, AlertRow } from '../ui'

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

  const listed = (query.data ?? [])
    .filter((a) => a.states.some((s) => states.includes(s)))
    .sort(compareAlerts)
    .map((a) => ({ alert: a, left: remainingMs(a.expires, now) }))
    .filter((r) => isListed(r.left))

  const active = listed.filter((r) => r.left === null || r.left > 0).length
  const view = alertsView({ isError: query.isError, hasData: query.data !== undefined, rows: listed.length })
  const degraded = view === 'degraded'
  const lastGood = query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null
  const age = lastGood === null ? '--' : formatAge(now - lastGood)

  const select = (a: Alert) => {
    const bbox = geometryBbox(a.geometry)
    if (bbox) setFocus({ id: a.id, bbox })
  }

  return (
    <Panel
      collapsible
      code="WX-02"
      title="NWS Alerts"
      status={queryStatus(query)}
      meta={`${active} ACTIVE · ${age}`}
    >
      <AlertList
        ref={listRef}
        feedError={
          view === 'degraded' || view === 'unavailable'
            ? { lastGood, retrying: query.isFetching, onRetry: () => void query.refetch() }
            : null
        }
        empty={
          view === 'empty'
            ? {
                label: 'NO ACTIVE ALERTS IN AOI',
                note: `NWS checked ${formatZulu(lastGood)}. Watches and outlooks stay on the map.`,
              }
            : null
        }
      >
        {listed.map(({ alert: a, left }) => {
          const bbox = geometryBbox(a.geometry)
          return (
            <AlertRow
              key={a.id}
              alertId={a.id}
              event={a.event}
              area={a.areaDesc}
              severity={a.severity}
              remainingMs={left}
              durationMs={alertDurationMs(a.onset, a.expires)}
              zone={a.geometry === null}
              selected={focus?.id === a.id}
              emergency={isPds(a)}
              degraded={degraded}
              onSelect={bbox ? () => select(a) : undefined}
            />
          )
        })}
      </AlertList>
    </Panel>
  )
}
