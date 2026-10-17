import { useEffect, useState } from 'react'
import { useAoi } from '../state/aoi'
import { LayoutMenu } from './LayoutMenu'
import { TopbarMore } from './TopbarMore'
import { AoiPresets } from './AoiPresets'
import { KeysButton } from './KeyboardShortcuts'
import { NotifyControl } from '../notify/NotifyControl'
import { ThreatButton, WarningsHiddenChip } from './ThreatButton'
import { useSource } from '../lib/useSource'
import { nwsPoint } from '../sources/nws/points'
import { DEVICE_ZONE, sameOffset, zoneLabel } from './clock'
import { OutlookRisk } from './OutlookRisk'
import { Abbr } from '../ui'
import { useWarningTitle } from './useWarningTitle'

// With 52 codes a wide AOI can touch 20+ states; the top bar shows the first few and a count.
const MAX_AOI_CODES = 6
const aoiLabel = (states: string[]) =>
  states.length > MAX_AOI_CODES
    ? `${states.slice(0, MAX_AOI_CODES).join(' · ')} +${states.length - MAX_AOI_CODES}`
    : states.join(' · ')

const fmtUtc = (d: Date) => d.toLocaleTimeString('en-US', { hourCycle: 'h23', timeZone: 'UTC' })

export function Topbar() {
  const [now, setNow] = useState(() => new Date())
  useWarningTitle()
  const states = useAoi((s) => s.states)
  const point = useSource(nwsPoint).data?.[0]
  const aoiZone = point?.timeZone
  // LOCAL only earns its place when the device is on a different offset from the AOI (or there is no AOI zone to compare).
  const showLocal = !aoiZone || !sameOffset(now, DEVICE_ZONE, aoiZone)
  const aoiTitle = point
    ? `${point.place ?? point.timeZone} (AOI centre; an AOI spanning two zones uses the centre)`
    : 'AOI centre: no NWS zone (offshore or loading)'

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
      {/* One AOI item: the states and the time where the AOI is (WP-34), so the bar fits one row with a live threat. */}
      <span className="topbar-item">
        <Abbr term="AOI" /> <strong title={states.join(' · ')}>{states.length ? aoiLabel(states) : '—'}</strong>
        {aoiZone && (
          <span className="topbar-aoi-clock">
            {' · '}
            <strong className="clock" title={aoiTitle}>
              {zoneLabel(now, aoiZone)}
            </strong>
          </span>
        )}
      </span>
      <ThreatButton />
      <WarningsHiddenChip />
      <OutlookRisk />
      <AoiPresets />
      <span className="spacer" />
      <TopbarMore>
        <NotifyControl />
        <KeysButton />
        <LayoutMenu />
      </TopbarMore>
      <span className="topbar-item">
        <Abbr term="UTC" /> <strong className="clock">{fmtUtc(now)}Z</strong>
      </span>
      {showLocal && (
        <span className="topbar-item topbar-local">
          <Abbr term="LOCAL" /> <strong className="clock">{zoneLabel(now, DEVICE_ZONE)}</strong>
        </span>
      )}
    </header>
  )
}
