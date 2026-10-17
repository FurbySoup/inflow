import { ROSTER } from '../sources/chasers/roster'
import { TaggedText } from '../ui'
import './feeds-quiet.css'

export interface QuietFeed {
  id: string
  title: string
  /** Public channel page, opened in a new tab. Link-out only: no embed on a quiet day. */
  watchUrl: string
}

export interface FeedsQuietProps {
  /** Curated feeds that are not live, shown as a one-line list of link-outs. */
  offline: QuietFeed[]
}

const BODY = `INFLOW checks ${ROSTER.length} chasers and storm-coverage channels and shows them here when they go live. On a quiet day, the SPC outlook days (D1–D8) on the map show where storms are expected.`

/**
 * Primary-slot slate shown while no feed is live (WP-50). Read-only: the names are links with the underline and ↗
 * signifier (ADR-0012), and nothing here plays. Replaces the YouTube embed that would show "unavailable".
 */
export function FeedsQuiet({ offline }: FeedsQuietProps) {
  return (
    <section className="feeds-quiet" aria-label="No chasers live right now">
      <p className="feeds-quiet-head">NO CHASERS LIVE RIGHT NOW</p>
      <p className="feeds-quiet-body">
        <TaggedText text={BODY} />
      </p>
      {offline.length > 0 && (
        <ul className="feeds-quiet-list">
          {offline.map((f) => (
            <li key={f.id}>
              <a href={f.watchUrl} target="_blank" rel="noopener noreferrer">
                {f.title} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
