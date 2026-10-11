import { useState } from 'react'

import { Badge, ConsoleButton } from '../ui'
import { useStreams } from '../state/streams'
import './LiveNow.css'

export interface LiveNowChip {
  id: string
  /** Visible name; the chip's accessible name starts with it. */
  name: string
  inAoi: boolean
  /** Verified coverage outlet (not a chaser). Labelled COVERAGE. */
  coverage: boolean
}

export interface LiveNowProps {
  /** Live feeds, AOI-relevant first (the order the grid shows them). */
  chips: LiveNowChip[]
  /** The feed in the main slot; its chip gets aria-current. */
  shownId: string | null
  /** Roster channels checked so far, and the roster size, for the empty state. */
  checked: number
  total: number
}

const COLLAPSED_COUNT = 8

/**
 * LIVE NOW index (WP-36): a wrapping row of chips, one per live feed. Picking a chip makes it the primary feed.
 * Signifier: the outlined console buttons; the current feed is solid-accent (ADR-0012). The LIVE NOW count is
 * read-only. Beyond 8 chips, `+N MORE` expands the row.
 */
export function LiveNow({ chips, shownId, checked, total }: LiveNowProps) {
  const [expanded, setExpanded] = useState(false)
  const setPrimary = useStreams((s) => s.setPrimary)

  if (chips.length === 0) {
    return <p className="muted live-now-empty">{`NO ROSTER CHASERS LIVE · CHECKED ${checked}/${total}`}</p>
  }

  const overflow = chips.length - COLLAPSED_COUNT
  const visible = expanded || overflow <= 0 ? chips : chips.slice(0, COLLAPSED_COUNT)

  return (
    <div className="live-now" role="group" aria-label="Live now">
      <span className="live-now-label">{`LIVE NOW · ${chips.length}`}</span>
      {visible.map((chip) => {
        const current = chip.id === shownId
        return (
          <ConsoleButton
            key={chip.id}
            className="live-now-chip"
            aria-current={current ? 'true' : undefined}
            onClick={() => setPrimary(chip.id)}
          >
            <span aria-hidden="true">● </span>
            {chip.name}
            {chip.inAoi && <Badge variant="aoi" />}
            {chip.coverage && <span className="live-now-coverage">COVERAGE</span>}
          </ConsoleButton>
        )
      })}
      {overflow > 0 && (
        <ConsoleButton variant="quiet" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
          {expanded ? '− LESS' : `+${overflow} MORE`}
        </ConsoleButton>
      )}
    </div>
  )
}
