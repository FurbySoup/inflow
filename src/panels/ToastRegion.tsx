import { useEffect, useRef, useState } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { isEmergency, isPds } from '../lib/hazards'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { Toast } from '../ui/Toast'
import { geometryBbox, remainingMs } from './alertGeometry'
import { capStack, diffNewTornadoWarnings, rememberTornadoWarnings, zuluTime } from './newAlerts'

/** An alert is live until its expiry; alerts without an expiry stay live until the feed drops them. */
const isLive = (a: Alert, t: number) => {
  const left = remainingMs(a.expires, t)
  return left === null || left > 0
}

/** Focus goes to the new toast's FOCUS button only when the user isn't typing in a field. */
const isTyping = () => {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.isContentEditable || el.matches('input, textarea, select'))
}

/**
 * New-tornado-warning toasts over the map (INFLOW v1 §6). Max three; the oldest drops.
 * A toast closes when its warning expires, is cancelled (leaves the feed), or is dismissed or focused.
 * It never times out while the warning is active.
 */
export function ToastRegion() {
  const query = useSource(nwsAlerts)
  const alerts = query.data
  const states = useAoi((s) => s.states)
  const setFocus = useAoi((s) => s.setFocus)
  const seenRef = useRef<Set<string> | null>(null)
  const newestRef = useRef<HTMLButtonElement | null>(null)
  const [ids, setIds] = useState<string[]>([])
  const [focusId, setFocusId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!alerts) return
    const t = Date.now()
    const fresh = diffNewTornadoWarnings(seenRef.current, alerts, states).filter((a) => isLive(a, t))
    seenRef.current = rememberTornadoWarnings(seenRef.current, alerts)
    if (fresh.length === 0) return
    setIds((prev) =>
      capStack([...prev.filter((id) => alerts.some((a) => a.id === id && isLive(a, t))), ...fresh.map((a) => a.id)]),
    )
    setFocusId(fresh[fresh.length - 1].id)
  }, [alerts, states])

  useEffect(() => {
    if (focusId && !isTyping()) newestRef.current?.focus({ preventScroll: true })
  }, [focusId])

  const visible = ids.flatMap((id) => {
    const a = alerts?.find((x) => x.id === id)
    return a && isLive(a, now) ? [a] : []
  })
  if (visible.length === 0) return null

  const dismiss = (id: string) => setIds((prev) => prev.filter((x) => x !== id))

  return (
    <div className="toast-region">
      {visible.map((a) => {
        const bbox = geometryBbox(a.geometry)
        return (
          <Toast
            key={a.id}
            pds={isPds(a)}
            emergency={isEmergency(a)}
            issued={zuluTime(a.onset) ?? '--:--Z'}
            title={a.event}
            area={a.areaDesc}
            remainingMs={remainingMs(a.expires, now)}
            until={zuluTime(a.expires)}
            onFocus={
              bbox
                ? () => {
                    setFocus({ id: a.id, bbox })
                    dismiss(a.id)
                  }
                : undefined
            }
            onDismiss={() => dismiss(a.id)}
            focusRef={a.id === focusId ? newestRef : undefined}
          />
        )
      })}
    </div>
  )
}
