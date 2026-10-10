import { AlertList, AlertRow } from 'storm-chasers'

const frame = { width: 340, padding: 10, background: 'var(--panel)' } as const

/** Live outbreak list: severity bars, countdowns (red under 10 min), zone watch, selected row. */
export const OutbreakList = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Jefferson, GA" severity="Extreme" remainingMs={542_000} selected onSelect={() => {}} />
      <AlertRow event="Tornado Warning" area="Screven, GA" severity="Extreme" remainingMs={1_302_000} onSelect={() => {}} />
      <AlertRow event="Tornado Watch" area="Burke, GA; Bamberg, SC; Barnwell, SC; Orangeburg, SC" severity="Extreme" remainingMs={16_200_000} zone />
      <AlertRow event="Severe Thunderstorm Warning" area="Allendale, SC" severity="Severe" remainingMs={1_860_000} onSelect={() => {}} />
      <AlertRow event="Flood Advisory" area="Cleveland, NC; Cherokee, SC" severity="Moderate" remainingMs={5_400_000} onSelect={() => {}} />
    </AlertList>
  </div>
)

/** PDS / emergency tornado warning: flashing red outline + PDS badge. */
export const Emergency = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Hampton, SC; Jasper, SC" severity="Extreme" remainingMs={410_000} emergency onSelect={() => {}} />
    </AlertList>
  </div>
)

/** Zone-based alert (no polygon): ZONE badge, no ⌖ glyph, not clickable. */
export const ZoneAlert = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Tornado Watch" area="Bulloch, GA; Candler, GA; Effingham, GA; Evans, GA" severity="Extreme" remainingMs={14_400_000} zone />
    </AlertList>
  </div>
)

/** No expiry known: no countdown. */
export const NoCountdown = () => (
  <div style={frame}>
    <AlertList>
      <AlertRow event="Rip Current Statement" area="Aransas Islands; Kleberg Islands" severity="Moderate" zone />
    </AlertList>
  </div>
)
