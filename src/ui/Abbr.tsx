import { Fragment, type ReactNode } from 'react'

import { GLOSSARY, expand } from './glossary'

export interface AbbrProps {
  /** The on-screen acronym or abbreviation, e.g. `TOR`, `AOI`, `WX-02`. Looked up in the glossary. */
  term: string
  /** What to show; defaults to `term`. Use it when the visible text differs (e.g. `IN AOI` for the `AOI` entry). */
  children?: ReactNode
  /** Overrides the glossary expansion. */
  title?: string
}

/**
 * An acronym with its expansion as a mouse-over tip (ADR-0018). Signifier: a dotted underline and the help cursor,
 * so the tip is discoverable; the tip is never the only carrier of meaning, because the help dialog lists the whole
 * glossary. Read-only: it is not focusable and does nothing on click. Terms not in the glossary render as plain text.
 */
export function Abbr({ term, children, title }: AbbrProps) {
  const tip = title ?? expand(term)
  if (!tip) return <>{children ?? term}</>
  return (
    <abbr className="abbr" title={tip}>
      {children ?? term}
    </abbr>
  )
}

// Glossary keys that are also ordinary words: auto-tagging them inside running text would underline plain English.
const NOT_AUTO_TAGGED = new Set(['LOCAL', 'OTHER', 'HIGH', 'ZONE', 'EMERGENCY', 'THUMB', 'Z', 'T-'])

/**
 * Renders a label string with every glossary acronym in it wrapped in `Abbr` (e.g. "NWS Alerts", "DOT Cameras",
 * "NO ACTIVE ALERTS IN AOI"). Kit components use it for string props (Panel title, empty labels) that must stay
 * strings for aria-labels and native tooltips. Ordinary words that happen to be glossary keys are left alone.
 */
export function TaggedText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) => {
        // Punctuation around a word ("SE.", "(SPC", "D1–D8)") stays outside the tip, so the term still matches.
        const [, lead = '', word = '', trail = ''] = /^([("'‘“]*)(.*?)([)"'’”.,;:!?]*)$/.exec(part) ?? []
        if (!GLOSSARY[word] || NOT_AUTO_TAGGED.has(word)) return <Fragment key={i}>{part}</Fragment>
        return (
          <Fragment key={i}>
            {lead}
            <Abbr term={word} />
            {trail}
          </Fragment>
        )
      })}
    </>
  )
}
