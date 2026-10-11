import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { kiwisdrDirectory, nearestCbReceivers, receiverFeeds } from '../sources/kiwisdr/receivers'
import { openmhzCalls, type ScannerCall } from '../sources/openmhz/calls'
import { coveredStates, openmhzSystems, systemsInAoi, type ScannerSystem } from '../sources/openmhz/systems'
import { useSource } from '../lib/useSource'
import { queryFeed } from '../lib/feedStatus'
import { useAoi } from '../state/aoi'
import { ConsoleButton } from '../ui'
import { Panel } from './Panel'

const select: CSSProperties = {
  fontFamily: 'var(--font-data)',
  fontSize: '0.75rem',
  color: 'var(--text)',
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  padding: '2px 4px',
  marginBottom: 8,
  maxWidth: '100%',
}

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '3px 0',
  fontFamily: 'var(--font-data)',
  fontSize: '0.75rem',
}

const MAX_CALLS_LISTED = 20

// Quiet systems can have hours-old newest calls; show age so the HH:MM:SSZ isn't misread as current.
function callAge(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function AudioPanel() {
  const bbox = useAoi((s) => s.bbox)
  const states = useAoi((s) => s.states)
  const scanner = useSource(openmhzSystems)
  const systems = useMemo(() => systemsInAoi(scanner.data ?? [], states), [scanner.data, states])
  const covered = useMemo(() => coveredStates(scanner.data ?? []), [scanner.data])
  const [picked, setPicked] = useState<string | null>(null)
  const system: ScannerSystem | undefined =
    systems.find((s) => s.shortName === picked) ?? systems[0]

  const directory = useSource(kiwisdrDirectory)
  const centre = useMemo(
    () => [(bbox.west + bbox.east) / 2, (bbox.south + bbox.north) / 2] as [number, number],
    [bbox],
  )
  const near = useMemo(
    () => nearestCbReceivers(directory.data ?? [], centre, 5),
    [directory.data, centre],
  )

  return (
    <Panel
      collapsible
      code="AUD-01"
      title="Radio / Scanner"
      status={queryFeed(directory, kiwisdrDirectory.refreshMs)}
      meta={directory.data ? `${near.length} RX NEAR` : undefined}
    >
      <p className="muted">SCANNER · OPENMHZ</p>
      {scanner.isError && <p className="error">OPENMHZ UNAVAILABLE</p>}
      {!scanner.isError && scanner.isPending && <p className="muted">LOADING SYSTEMS</p>}
      {scanner.data &&
        (system ? (
          <>
            <select
              aria-label="Scanner system"
              style={select}
              value={system.shortName}
              onChange={(e) => setPicked(e.target.value)}
            >
              {systems.map((s) => (
                <option key={s.shortName} value={s.shortName}>
                  {s.place ? `${s.name} · ${s.place} (${s.state})` : `${s.name} (${s.state})`}
                </option>
              ))}
            </select>
            {/* Keyed so playback state never carries over to another system. */}
            <ScannerPlayer key={system.shortName} shortName={system.shortName} />
          </>
        ) : (
          <p className="muted">
            {covered.length > 0
              ? `NO OPENMHZ SYSTEMS IN AOI — COVERED: ${covered.join(' · ')}`
              : 'NO OPENMHZ SYSTEMS IN AOI'}
          </p>
        ))}

      <p className="muted" style={{ marginTop: 12 }}>
        CB 19 / 2M · KIWISDR LINK-OUT
      </p>
      {directory.isError && <p className="error">KIWISDR DIRECTORY UNAVAILABLE</p>}
      {!directory.isError && directory.isPending && <p className="muted">LOADING RECEIVERS</p>}
      {directory.data && near.length === 0 && (
        <p className="muted">NO ONLINE 27 MHZ RECEIVERS IN RANGE</p>
      )}
      {near.map(({ receiver, km }) => (
        <div key={receiver.id} style={row}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {receiver.name}
          </span>
          <span className="muted">{Math.round(km)} KM</span>
          {receiverFeeds(receiver).map((f) => (
            <a key={f.id} className="btn-console" href={f.pageUrl ?? undefined} target="_blank" rel="noopener noreferrer">
              {f.kind === 'cb' ? 'CB 19' : '2M'} ↗
            </a>
          ))}
        </div>
      ))}
    </Panel>
  )
}

function ScannerPlayer({ shortName }: { shortName: string }) {
  const adapter = useMemo(() => openmhzCalls(shortName), [shortName])
  const query = useSource(adapter)
  const calls: ScannerCall[] = query.data ?? []

  const [current, setCurrent] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const a = audio.current
    if (!a) return
    if (playing && current) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [playing, current])

  // Newest first; auto-advance steps to the next older call and stops at the end of the list.
  const next = () => {
    const i = calls.findIndex((c) => c.url === current)
    const following = calls[i + 1]
    if (following) setCurrent(following.url)
    else setPlaying(false)
  }

  const toggle = () => {
    if (playing) return setPlaying(false)
    if (calls.length === 0) return
    setCurrent(current ?? calls[0].url)
    setPlaying(true)
  }

  const playCall = (c: ScannerCall) => {
    setCurrent(c.url)
    setPlaying(true)
  }

  return (
    <>
      {query.isError && <p className="error">OPENMHZ UNAVAILABLE</p>}
      {!query.isError && query.isPending && <p className="muted">LOADING CALLS</p>}
      {query.data && calls.length === 0 && <p className="muted">NO RECENT CALLS</p>}
      {calls.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <ConsoleButton pressed={playing} onClick={toggle}>
              {playing ? 'STOP' : 'PLAY LATEST'}
            </ConsoleButton>
            <audio
              ref={audio}
              src={current ?? undefined}
              controls
              preload="none"
              onEnded={next}
              onError={() => setPlaying(false)}
              style={{ flex: 1, minWidth: 0, height: 28 }}
            />
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {calls.slice(0, MAX_CALLS_LISTED).map((c) => (
              <li key={c.id} style={row}>
                <ConsoleButton pressed={c.url === current} onClick={() => playCall(c)}>
                  {new Date(c.time).toISOString().slice(11, 19)}Z
                </ConsoleButton>
                <span className="muted">{c.talkgroup !== null ? `TG ${c.talkgroup}` : 'TG —'} · {callAge(c.time)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  )
}
