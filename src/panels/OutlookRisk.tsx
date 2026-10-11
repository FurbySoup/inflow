import type { CSSProperties } from 'react'
import { useSource } from '../lib/useSource'
import { spcOutlookDay } from '../sources/spc/outlook'
import { useAoi } from '../state/aoi'
import { Abbr } from '../ui'
import { highestCategory, riskSummary, type RiskCategory } from './spcRisk'

// Top-bar SPC risk for the AOI (Days 1–3). Read-only (ADR-0012): plain text, no border or button look.
// The swatch uses the SPC category token; the word itself carries the meaning, so the swatch is decorative.

const swatch = (label: RiskCategory): CSSProperties => ({
  display: 'inline-block',
  width: '0.7em',
  height: '0.7em',
  marginRight: '0.35em',
  background: `var(--p-spc-${label.toLowerCase()})`,
})

export function OutlookRisk() {
  const bbox = useAoi((s) => s.bbox)
  const d1 = useSource(spcOutlookDay(1))
  const d2 = useSource(spcOutlookDay(2))
  const d3 = useSource(spcOutlookDay(3))
  const queries = [d1, d2, d3]

  if (queries.some((q) => q.isPending)) return null
  // A failed day with no last-good data would read as "no risk" if we summarised the rest: say so instead.
  if (queries.some((q) => q.isError && q.data === undefined)) {
    return (
      <span className="topbar-item" title="SPC outlook feed unavailable">
        SPC ■ UNAVAILABLE
      </span>
    )
  }

  const category = (q: { data?: GeoJSON.Feature[] }) => (q.data ? highestCategory(q.data, bbox) : null)
  const summary = riskSummary(category(d1), category(d2), category(d3))

  return (
    <span className="topbar-item" title="Highest SPC categorical risk in view, Days 1–3">
      <Abbr term="SPC" />{' '}
      {summary.map((r, i) => (
        <span key={r.day}>
          {i > 0 && ' · '}D{r.day}{' '}
          {r.label ? (
            <>
              <span aria-hidden="true" style={swatch(r.label)} />
              <strong>
                <Abbr term={r.label} />
              </strong>
            </>
          ) : (
            '—'
          )}
        </span>
      ))}
    </span>
  )
}
