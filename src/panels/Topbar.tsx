import { useEffect, useState } from 'react'
import { useAoi } from '../state/aoi'
import { LayoutMenu } from './LayoutMenu'
import { AoiPresets } from './AoiPresets'
import { KeysButton } from './KeyboardShortcuts'

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
      {/* INFLOW brand (design handoff v1, direction 1a): AOI-reticle mark + wordmark. Never in a hazard colour, never animated. */}
      <span className="brand" aria-label="INFLOW">
        <svg className="brand-mark" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" stroke="var(--accent)" strokeWidth="2" />
          <rect x="6" y="6" width="4" height="4" fill="var(--text-bright)" />
        </svg>
        <span className="brand-word">INFLOW</span>
      </span>
      <span className="topbar-item">
        AOI <strong>{states.length ? states.join(' · ') : '—'}</strong>
      </span>
      <AoiPresets />
      <span className="spacer" />
      <KeysButton />
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
