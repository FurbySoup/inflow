import { useEffect, useState } from 'react'
import { useAoi } from '../state/aoi'
import { LayoutMenu } from './LayoutMenu'

const fmt = (d: Date, timeZone?: string) =>
  d.toLocaleTimeString('en-US', { hour12: false, timeZone })

export function Topbar() {
  const [now, setNow] = useState(() => new Date())
  const states = useAoi((s) => s.states)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="topbar">
      <span className="brand">
        STORM<span className="accent">//</span>CHASERS
      </span>
      <span className="topbar-item">
        AOI <strong>{states.length ? states.join(' · ') : '—'}</strong>
      </span>
      <span className="spacer" />
      <LayoutMenu />
      <span className="topbar-item">
        UTC <strong className="clock">{fmt(now, 'UTC')}Z</strong>
      </span>
      <span className="topbar-item topbar-local">
        LOCAL <strong className="clock">{fmt(now)}</strong>
      </span>
    </header>
  )
}
