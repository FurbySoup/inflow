import type { ReactNode } from 'react'

import { expand } from './glossary'

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
