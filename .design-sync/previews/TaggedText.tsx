import { TaggedText } from 'storm-chasers'

const row = { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: 'var(--panel)' } as const

/** Panel titles and empty-state labels: every glossary acronym in the string gets a tip; plain words stay plain. */
export const LabelsWithAcronyms = () => (
  <div style={row}>
    <span className="panel-code">
      <TaggedText text="NWS Alerts" />
    </span>
    <span className="panel-code">
      <TaggedText text="DOT Cameras" />
    </span>
    <span className="muted">
      <TaggedText text="NO ACTIVE ALERTS IN AOI" />
    </span>
  </div>
)

/** Ordinary words that are also glossary keys (HIGH, LOCAL, ZONE…) are never underlined inside running text. */
export const OrdinaryWordsUntouched = () => (
  <div style={row}>
    <span className="muted">
      <TaggedText text="HIGH WIND · LOCAL ROADS CLOSED · SPC SLGT" />
    </span>
  </div>
)
