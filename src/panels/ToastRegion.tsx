import { useEffect, useMemo, useRef, useState } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { isEmergency, isPds } from '../lib/hazards'
import { useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { Toast } from '../ui/Toast'
import { geometryBbox, remainingMs } from './alertGeometry'
import { capStack, diffNewTornadoWarnings, findCurrent, rememberTornadoWarnings, zuluTime } from './newAlerts'

/** Live until expiry, and not cancelled. Alerts without an expiry stay live until the feed drops them. */
const isLive = (a: Alert, t: number) => {
  if (a.messageType === 'Cancel') return false
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
 * Toasts are keyed by eventKey (VTEC): an NWS update refreshes the open toast's expiry and area, it never re-toasts.
 * A toast closes when its warning expires, is cancelled or leaves the feed, or is dismissed or focused.
 * It never times out while the warning is active.
 */
export function ToastRegion() {
  const query = useSource(nwsAlerts)
  const alerts = query.data
  const bbox = useAoi((s) => s.bbox)
  const states = useAoi((s) => s.states)
  const aoi = useMemo(() => ({ bbox, states }), [bbox, states])
  const setFocus = useAoi((s) => s.setFocus)
  const seenRef = useRef<Set<string> | null>(null)
  const newestRef = useRef<HTMLButtonElement | null>(null)
  const [keys, setKeys] = useState<string[]>([])
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Tick the countdowns only while a toast is open.
  const open = keys.length > 0
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!alerts) return
    const t = Date.now()
    const fresh = diffNewTornadoWarnings(seenRef.current, alerts, aoi).filter((a) => isLive(a, t))
    seenRef.current = rememberTornadoWarnings(seenRef.current, alerts)
    if (fresh.length === 0) return
    setKeys((prev) =>
      capStack([
        ...prev.filter((key) => {
          const a = findCurrent(alerts, key)
          return a !== null && isLive(a, t)
        }),
        ...fresh.map((a) => a.eventKey),
      ]),
    )
    setFocusKey(fresh[fresh.length - 1].eventKey)
  }, [alerts, aoi])

  useEffect(() => {
    if (focusKey && !isTyping()) newestRef.current?.focus({ preventScroll: true })
  }, [focusKey])

  // Current version of each open event (updates replace the alert object, the key stays).
  const visible = keys.flatMap((key) => {
    const a = alerts ? findCurrent(alerts, key) : null
    return a && isLive(a, now) ? [a] : []
  })
  if (visible.length === 0) return null

  // Keyboard users keep their place: after a toast closes, focus moves to the newest remaining toast.
  const dismiss = (key: string) =>
    setKeys((prev) => {
      const rest = prev.filter((x) => x !== key)
      setFocusKey(rest.length > 0 ? rest[rest.length - 1] : null)
      return rest
    })

  return (
    <div className="toast-region">
      {visible.map((a) => {
        const bbox = geometryBbox(a.geometry)
        return (
          <Toast
            key={a.eventKey}
            pds={isPds(a)}
            emergency={isEmergency(a)}
            issued={zuluTime(a.sent ?? a.onset) ?? '--:--Z'}
            title={a.event}
            area={a.areaDesc}
            remainingMs={remainingMs(a.expires, now)}
            until={zuluTime(a.expires)}
            onFocus={
              bbox
                ? () => {
                    setFocus({ id: a.id, bbox })
                    dismiss(a.eventKey)
                  }
                : undefined
            }
            onDismiss={() => dismiss(a.eventKey)}
            focusRef={a.eventKey === focusKey ? newestRef : undefined}
          />
        )
      })}
    </div>
  )
}
