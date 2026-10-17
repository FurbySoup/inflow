import { TaggedText } from '../../ui'
import { START_HERE } from './startHere'

// The START HERE tab of `? HELP` (WP-52): the numbered steps from startHere.ts, for someone who has never seen the
// screen. Read-only: plain text, not focusable, no hover, and not searchable. Glossary terms in the body get their
// tips through TaggedText (ADR-0018).

export function StartHereTab() {
  return (
    <ol className="start-steps">
      {START_HERE.map((step) => (
        <li key={step.title} className="start-step">
          <h3 className="help-group-title">{step.title}</h3>
          <p className="start-body">
            <TaggedText text={step.body} />
          </p>
        </li>
      ))}
    </ol>
  )
}
