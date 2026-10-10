import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { Panel } from './Panel'
import { queryStatus } from '../lib/feedStatus'
import { formatRemaining, geometryBbox, isEmergencyWarning, remainingMs } from './alertGeometry'

const SEVERITY_RANK = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }
const LOW_TIME_MS = 10 * 60_000

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
    <Panel code="WX-02" title="NWS Alerts" status={queryStatus(query)} meta={visible.length}>
      {query.isError && <p className="error">NWS alerts unavailable</p>}
      <ul className="alerts" ref={listRef}>
        {visible.map((a) => (
          <AlertRow key={a.id} alert={a} now={now} selected={focus?.id === a.id} onSelect={select} />
        ))}
      </ul>
    </Panel>
  )
}

interface AlertRowProps {
  alert: Alert
  now: number
  selected: boolean
  onSelect: (a: Alert) => void
}

function AlertRow({ alert: a, now, selected, onSelect }: AlertRowProps) {
  const ref = useRef<HTMLLIElement>(null)
  const left = remainingMs(a.expires, now)
  const clickable = a.geometry !== null
  const flashing = isEmergencyWarning(a.event, a.headline)

  // Flashing border is driven by WAAPI so it can respect reduced motion without a shared stylesheet change.
  useEffect(() => {
    const el = ref.current
    if (!flashing || !el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const anim = el.animate(
      [{ outlineColor: 'transparent' }, { outlineColor: 'var(--error)' }],
      { duration: 800, iterations: Infinity, direction: 'alternate' },
    )
    return () => anim.cancel()
  }, [flashing])

  const style: CSSProperties = {
    cursor: clickable ? 'pointer' : 'default',
    background: selected ? 'var(--panel-head)' : undefined,
    boxShadow: selected ? 'inset 3px 0 0 var(--accent)' : undefined,
    outline: flashing ? '2px solid transparent' : undefined,
    outlineOffset: flashing ? -2 : undefined,
  }

  return (
    <li
      ref={ref}
      data-alert-id={a.id}
      className={`sev-${a.severity.toLowerCase()}`}
      style={style}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSelect(a) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(a)
              }
            }
          : undefined
      }
    >
      <strong>{a.event.toUpperCase()}</strong>
      {!clickable && (
        <span
          style={{
            marginLeft: 8,
            padding: '0 4px',
            border: '1px solid var(--muted)',
            color: 'var(--muted)',
            fontFamily: 'var(--font-data)',
            fontSize: '0.7rem',
          }}
        >
          ZONE
        </span>
      )}
      {left !== null && (
        <span
          style={{
            marginLeft: 8,
            fontFamily: 'var(--font-data)',
            color: left < LOW_TIME_MS ? 'var(--error)' : undefined,
          }}
        >
          {formatRemaining(left)}
        </span>
      )}
      <span className="muted">{a.areaDesc}</span>
    </li>
  )
}
