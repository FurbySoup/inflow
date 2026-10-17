import type { ReactNode } from 'react'
import { TaggedText } from '../../ui'
import { CAMERA_CREDITS, CREDITS, DATA_TERMS, DISCLAIMER, PROJECT } from './about'

// The ABOUT tab of `? HELP` (WP-47): disclaimer, identity and version, data terms, and source credits.
// Affordance: the links open the source sites in a new tab. Signifier: underline plus a ↗ glyph (ADR-0012).
// Feedback: hover thickens the underline, focus shows the focus ring. The disclaimer block is read-only and
// carries no link or hover styling, so it does not look clickable.

/** An external link: underline and ↗ are the signifier, and the new-tab warning is in the accessible name. */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="about-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="about-ext" aria-hidden="true">
        ↗
      </span>
      <span className="about-sr-only"> (opens in a new tab)</span>
    </a>
  )
}

export function AboutTab() {
  return (
    <div className="about">
      <div className="about-disclaimer" role="note">
        <TaggedText text={DISCLAIMER} />
      </div>

      <p className="about-identity">
        <strong className="about-name">{PROJECT.name}</strong>: {PROJECT.descriptor}
        <span className="about-sep" aria-hidden="true">
          {' · '}
        </span>
        <span className="about-version">v{__APP_VERSION__}</span>
        <span className="about-sep" aria-hidden="true">
          {' · '}
        </span>
        <TaggedText text={`${PROJECT.licence} licence`} />
        <span className="about-sep" aria-hidden="true">
          {' · '}
        </span>
        <ExternalLink href={PROJECT.repo}>SOURCE ON GITHUB</ExternalLink>
      </p>

      <section className="about-section" aria-labelledby="about-terms-title">
        <h3 className="help-group-title" id="about-terms-title">
          How the data is used
        </h3>
        <ul className="about-terms">
          {DATA_TERMS.map((term) => (
            <li key={term}>
              <TaggedText text={term} />
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-credits-title">
        <h3 className="help-group-title" id="about-credits-title">
          Data and credits
        </h3>
        <dl className="about-credits">
          {CREDITS.map((c) => (
            <div key={c.who} className="about-credit">
              <dt>
                <ExternalLink href={c.url}>
                  <TaggedText text={c.who} />
                </ExternalLink>
              </dt>
              <dd>
                <TaggedText text={c.what} />
                {c.note && (
                  <span className="about-note">
                    {' '}
                    <TaggedText text={c.note} />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-section" aria-labelledby="about-cams-title">
        <h3 className="help-group-title" id="about-cams-title">
          Traffic cameras
        </h3>
        <p className="about-cams-lead">Images belong to each state&apos;s DOT.</p>
        <ul className="about-cameras">
          {CAMERA_CREDITS.map((c) => (
            <li key={c.site} className="about-camera">
              <span className="about-camera-site">{c.site}</span>
              <span className="about-camera-agency">{c.agency}</span>
              <span className="about-camera-states">{c.states}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
