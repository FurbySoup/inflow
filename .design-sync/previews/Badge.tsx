import { Badge } from 'storm-chasers'

const row = { display: 'flex', gap: 8, alignItems: 'center', padding: 12, background: 'var(--panel)' } as const

/** All four variants with their standard labels. */
export const Variants = () => (
  <div style={row}>
    <Badge variant="aoi" />
    <Badge variant="ctx" />
    <Badge variant="zone" />
    <Badge variant="pds" />
  </div>
)

/** In context: badges trailing a stream caption and an alert title. */
export const InContext = () => (
  <div style={{ ...row, flexDirection: 'column', alignItems: 'flex-start' }}>
    <span className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span className="panel-code">CAM 03</span> Brandon Copic: tropical tornado threat, E GA &amp; SC
      <Badge variant="aoi" />
    </span>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-data)', fontSize: '0.75rem' }}>
      <strong>TORNADO WARNING</strong>
      <Badge variant="pds" />
    </span>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-data)', fontSize: '0.75rem' }}>
      <strong>TORNADO WATCH</strong>
      <Badge variant="zone" />
    </span>
  </div>
)

/** Custom label overrides the variant default. */
export const CustomLabel = () => (
  <div style={row}>
    <Badge variant="aoi">GA · SC</Badge>
    <Badge variant="ctx">ISS</Badge>
  </div>
)
