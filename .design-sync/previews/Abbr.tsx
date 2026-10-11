import { Abbr } from 'storm-chasers'

const row = { display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--panel)', fontFamily: 'var(--font-data)' } as const

/** Console labels with their glossary tips: dotted underline + help cursor; hover shows the expansion. */
export const ConsoleLabels = () => (
  <div style={row}>
    <span className="muted">
      <Abbr term="AOI" /> <strong>GA · SC</strong>
    </span>
    <span className="muted">
      <Abbr term="UTC" /> <strong className="accent">18:25:38Z</strong>
    </span>
    <span className="panel-code">
      <Abbr term="WX-02" />
    </span>
  </div>
)

/** SPC categories and NWS hazard codes, the densest acronyms on the console. */
export const HazardAndOutlookTerms = () => (
  <div style={row}>
    <Abbr term="TOR" />
    <Abbr term="SVR" />
    <Abbr term="PDS" />
    <span className="muted">SPC D1</span>
    <Abbr term="MRGL" />
    <Abbr term="SLGT" />
    <Abbr term="ENH" />
  </div>
)

/** A term missing from the glossary renders as plain text: no underline, no empty tip. */
export const UnknownTerm = () => (
  <div style={row}>
    <Abbr term="ZZZ">ZZZ (not in glossary)</Abbr>
  </div>
)
