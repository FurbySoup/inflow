import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { kiwisdrDirectory, nearestCbReceivers, receiverFeeds } from '../sources/kiwisdr/receivers'
import { openmhzCalls, type ScannerCall } from '../sources/openmhz/calls'
import { coveredStates, openmhzSystems, systemLabel, systemsInAoi, type ScannerSystem } from '../sources/openmhz/systems'
import { useSource } from '../lib/useSource'
import { queryFeed, queryStatus } from '../lib/feedStatus'
import { useAoi } from '../state/aoi'
import { Abbr, ConsoleButton, type FeedStatus } from '../ui'
import { Panel } from './Panel'

// Tips for terms not yet in the kit glossary (ADR-0018); the glossary entries are added at merge.
const OPENMHZ_TIP =
  'OpenMHz: a public archive of recorded trunked-radio calls (police, fire, EMS), played here'
const KIWISDR_TIP =
  'KiwiSDR: a volunteer-run receiver you tune in a web browser. Opens on its own page (link-out only)'
const MHZ_TIP = 'Megahertz: one million cycles per second. The CB band is 27 MHz'
const KM_TIP = 'Kilometres from the centre of your area of interest'

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

// Worst first. Offline and stale are not produced by the two feeds here; they are ranked so the function is total.
const SEVERITY: FeedStatus[] = ['error', 'offline', 'loading', 'stale', 'live']

/** The worse of two feed statuses. The panel body shows both feeds, so the LED must reflect both. */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for its test
export function worstStatus(a: FeedStatus, b: FeedStatus): FeedStatus {
  return SEVERITY.indexOf(a) <= SEVERITY.indexOf(b) ? a : b
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
      status={{
        ...queryFeed(directory, kiwisdrDirectory.refreshMs),
        status: worstStatus(queryStatus(scanner), queryStatus(directory)),
      }}
      meta={
        directory.data ? (
          <>
            {near.length} <Abbr term="RX" /> NEAR
          </>
        ) : undefined
      }
    >
      <p className="muted">
        SCANNER · <Abbr term="OPENMHZ" title={OPENMHZ_TIP} />
      </p>
      {scanner.isError && (
        <p className="error">
          <Abbr term="OPENMHZ" title={OPENMHZ_TIP} /> UNAVAILABLE
        </p>
      )}
      {!scanner.isError && scanner.isPending && <p className="muted">LOADING SYSTEMS</p>}
      {scanner.data &&
        (system ? (
          <>
            <select
              aria-label="Scanner system"
              title="OpenMHz system to listen to"
              style={select}
              value={system.shortName}
              onChange={(e) => setPicked(e.target.value)}
            >
              {systems.map((s) => (
                <option key={s.shortName} value={s.shortName}>
                  {systemLabel(s, systems)}
                </option>
              ))}
            </select>
            <p className="muted" style={{ marginTop: 0 }}>
              Recorded calls from public-safety radio, newest first.
            </p>
            {/* Keyed so playback state never carries over to another system. */}
            <ScannerPlayer key={system.shortName} shortName={system.shortName} />
          </>
        ) : (
          <p className="muted">
            NO <Abbr term="OPENMHZ" title={OPENMHZ_TIP} /> SYSTEMS IN <Abbr term="AOI" />
            {covered.length > 0 && ` — COVERED: ${covered.join(' · ')}`}
          </p>
        ))}

      <p className="muted" style={{ marginTop: 12 }}>
        <Abbr term="CB" /> 19 / <Abbr term="2M" /> · <Abbr term="KIWISDR" title={KIWISDR_TIP} /> LINK-OUT
      </p>
      {directory.isError && (
        <p className="error">
          <Abbr term="KIWISDR" title={KIWISDR_TIP} /> DIRECTORY UNAVAILABLE
        </p>
      )}
      {!directory.isError && directory.isPending && <p className="muted">LOADING RECEIVERS</p>}
      {directory.data && near.length === 0 && (
        <p className="muted">
          NO ONLINE 27 <Abbr term="MHZ" title={MHZ_TIP} /> RECEIVERS IN RANGE
        </p>
      )}
      {near.map(({ receiver, km }) => (
        <div key={receiver.id} style={row}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {receiver.name}
          </span>
          <span className="muted">
            {Math.round(km)} <Abbr term="KM" title={KM_TIP} />
          </span>
          {receiverFeeds(receiver).map((f) => (
            <a key={f.id} className="btn-console" href={f.pageUrl ?? undefined} target="_blank" rel="noopener noreferrer">
              {f.kind === 'cb' ? (
                <>
                  <Abbr term="CB" /> 19
                </>
              ) : (
                <Abbr term="2M" />
              )}{' '}
              ↗
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
      {query.isError && <p className="error">SCANNER CALLS UNAVAILABLE</p>}
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
                  {new Date(c.time).toISOString().slice(11, 19)}
                  <Abbr term="Z" />
                </ConsoleButton>
                <span className="muted">
                  <Abbr term="TG" /> {c.talkgroup !== null ? c.talkgroup : '—'} · {callAge(c.time)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  )
}
