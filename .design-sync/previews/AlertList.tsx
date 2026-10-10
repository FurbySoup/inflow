import { AlertList, AlertRow } from 'storm-chasers'

const frame = { width: 340, padding: 10, background: 'var(--panel)' } as const

/** Severity-ranked list as the alerts panel renders it. */
export const SeverityRanked = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Hampton, SC; Jasper, SC" severity="Extreme" remainingMs={410_000} emergency onSelect={() => {}} />
      <AlertRow event="Tornado Warning" area="Jefferson, GA" severity="Extreme" remainingMs={1_542_000} onSelect={() => {}} />
      <AlertRow event="Severe Thunderstorm Warning" area="Allendale, SC" severity="Severe" remainingMs={1_860_000} onSelect={() => {}} />
      <AlertRow event="Flood Advisory" area="Cleveland, NC; Cherokee, SC" severity="Moderate" remainingMs={5_400_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Quiet day: a single minor statement. */
export const Quiet = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Special Weather Statement" area="Fulton, GA; DeKalb, GA" severity="Minor" remainingMs={3_000_000} zone />
    </AlertList>
  </div>
)
