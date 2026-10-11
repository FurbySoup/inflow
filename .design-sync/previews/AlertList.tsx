import { AlertList, AlertRow } from 'storm-chasers'

const frame = { width: 340, padding: 10, background: 'var(--surface-panel)' } as const

/** Live outbreak list: PDS first, then TOR, SVR and watches, with the focused row and a sub-10-min countdown. */
export const OutbreakList = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Moore · Norman OK" severity="Extreme" remainingMs={1_308_000} durationMs={2_700_000} emergency onSelect={() => {}} />
      <AlertRow event="Tornado Warning" area="Cleveland OK" severity="Extreme" remainingMs={452_000} durationMs={2_700_000} selected onSelect={() => {}} />
      <AlertRow event="Severe Thunderstorm Warning" area="Caddo · Comanche OK" severity="Severe" remainingMs={1_910_000} durationMs={3_600_000} onSelect={() => {}} />
      <AlertRow event="Tornado Watch 212" area="34 counties · OK KS" severity="Extreme" remainingMs={14_420_000} durationMs={25_200_000} zone />
      <AlertRow event="Severe Thunderstorm Watch 213" area="N TX · S OK" severity="Severe" remainingMs={11_800_000} durationMs={21_600_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Feed error after good data: banner with last-good time, RETRY and WEATHER.GOV, last-known rows at 72%. */
export const FeedError = () => (
  <div style={frame}>
    <AlertList
      feedError={{ lastGood: Date.parse('2026-10-10T21:47:12Z'), retrying: false, onRetry: () => {} }}
    >
      <AlertRow event="Tornado Warning" area="Cleveland OK" severity="Extreme" remainingMs={452_000} durationMs={2_700_000} degraded onSelect={() => {}} />
      <AlertRow event="Severe Thunderstorm Warning" area="Caddo · Comanche OK" severity="Severe" remainingMs={1_910_000} durationMs={3_600_000} degraded onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Feed error while retrying: the button reads ◌ LOADING. */
export const FeedErrorRetrying = () => (
  <div style={frame}>
    <AlertList
      feedError={{ lastGood: Date.parse('2026-10-10T21:47:12Z'), retrying: true, onRetry: () => {} }}
    />
  </div>
)

/** Quiet day, feed healthy: label plus one sentence. */
export const Empty = () => (
  <div style={frame}>
    <AlertList
      empty={{ label: 'NO ACTIVE ALERTS IN AOI', note: 'NWS checked 21:47:12Z. Watches and outlooks stay on the map.' }}
    />
  </div>
)
