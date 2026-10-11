import { AlertList, AlertRow } from 'storm-chasers'

const frame = { width: 340, padding: 10, background: 'var(--surface-panel)' } as const

/** Hazard chips: warnings are solid, watches are dashed; the code comes from the event. */
export const HazardChips = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Grady · McClain OK" severity="Extreme" remainingMs={1_092_000} durationMs={2_700_000} onSelect={() => {}} />
      <AlertRow event="Severe Thunderstorm Warning" area="Caddo · Comanche OK" severity="Severe" remainingMs={1_910_000} durationMs={3_600_000} onSelect={() => {}} />
      <AlertRow event="Flash Flood Warning" area="Oklahoma Co. OK" severity="Severe" remainingMs={6_210_000} durationMs={10_800_000} onSelect={() => {}} />
      <AlertRow event="Special Weather Statement" area="Fulton, GA; DeKalb, GA" severity="Minor" remainingMs={3_000_000} durationMs={7_200_000} zone />
      <AlertRow event="Dense Fog Advisory" area="Bulloch, GA" severity="Moderate" remainingMs={5_400_000} zone />
    </AlertList>
  </div>
)

/** Watch vs warning: the same hazard as a dashed-border watch and a solid warning. */
export const WatchVsWarning = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Watch" area="212 · 34 counties · OK KS" severity="Extreme" remainingMs={14_420_000} durationMs={25_200_000} zone />
      <AlertRow event="Tornado Warning" area="Cotton OK" severity="Extreme" remainingMs={2_010_000} durationMs={2_700_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** PDS tornado warning: TOR chip with inset white ring, PDS badge, static outline under reduced motion. */
export const Pds = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Moore · Norman OK" severity="Extreme" remainingMs={1_308_000} durationMs={2_700_000} emergency onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Focused row: accent fill, accent outline and a filled ⌖ box. */
export const Focused = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Cleveland OK" severity="Extreme" remainingMs={452_000} durationMs={2_700_000} selected onSelect={() => {}} />
      <AlertRow event="Tornado Warning" area="Grady · McClain OK" severity="Extreme" remainingMs={1_092_000} durationMs={2_700_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Countdown under 10 min is red; the bar shows the remaining share of the window. */
export const Countdown = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Sumner KS" severity="Extreme" remainingMs={288_000} durationMs={2_700_000} onSelect={() => {}} />
      <AlertRow event="Severe Thunderstorm Warning" area="Wichita Falls TX" severity="Severe" remainingMs={3_780_000} durationMs={3_600_000} onSelect={() => {}} />
      <AlertRow event="Tornado Warning" area="Jefferson, GA" severity="Extreme" remainingMs={4_320_000} durationMs={5_400_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Expired row: 60% opacity with strike-through, kept for 60 s. */
export const Expired = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Logan · Kingfisher OK" severity="Extreme" remainingMs={-30_000} durationMs={2_700_000} onSelect={() => {}} />
    </AlertList>
  </div>
)
