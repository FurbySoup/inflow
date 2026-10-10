# 0012. Interaction design: affordances, signifiers, feedback (Norman)
Status: Accepted
Date: 2026-10-10

## Context
Storm Chasers is a dense, glanceable console used under time pressure. Users must instantly tell what they can act on and what they're only meant to read. Don Norman's model gives the vocabulary:
- **Affordance**: what an element actually lets you do (click an alert to focus the map, drag a splitter, collapse a panel).
- **Signifier**: the perceivable cue that shows the affordance exists and where it is. On a flat dark console, affordances are invisible unless signified.
- **Feedback**: immediate confirmation that an action happened and what state resulted.
- **Mapping**: controls placed next to and shaped like what they affect.
- **Constraints**: things that can't be acted on don't invite action.
- **Conceptual model**: one consistent mental model, "one area of interest drives every panel". This narrows the gulf of execution (how do I do X?) and the gulf of evaluation (did it work, what state am I in?).

## Decision
Every interactive element in the UI kit (`src/ui/`) and app chrome must have a **visible, persistent signifier**, plus a hover state (pointer), a `:focus-visible` state (keyboard) and **feedback** for its resulting state. Hover alone is not a signifier: wall displays and touch have no hover.

| Element | Affordance | Signifier | Feedback |
|---|---|---|---|
| Alert row (polygon) | Focus map on it | Persistent ⌖ glyph; zone rows lack it and carry a `ZONE` badge instead | Accent inset bar + accent ⌖ on the selected row; map flies to it and outlines it |
| Stream caption | Make primary feed | Button that underlines on hover/focus | Primary caption stays accent (`aria-current`) |
| Camera tile | Expand | Bordered tile, accent border on hover | Expanded view opens above the grid |
| Panel ▾/▸ | Collapse/expand | Chevron in the header | Body hides; collapsed header shrinks to LED + code |
| Splitter | Resize | Dotted grip, accent on hover/focus | Live resize; double-click resets |
| Console button | Run action/preset | Outlined accent box | Pressed state via `aria-pressed` |
| Badges, LEDs, counts | None (read-only) | No border-radius buttons, no pointer, no hover change | — |

Rules:
- **Constraints over warnings:** non-actionable items (zone alerts, badges) never look clickable. Actionable items never look like plain text.
- **Mapping:** controls live in the header or on the object they affect (layer switchboard on the map, collapse on the panel, presets in the top bar).
- **Severity and state are never colour-only:** pair colour with a glyph, badge or text (`PDS`, `ZONE`, `T-mm:ss`, LED plus `aria-label`).
- **Every motion is feedback, never decoration.** All motion respects `prefers-reduced-motion`.

## Consequences
- New components must state their affordance, signifier and feedback in their JSDoc. The design agent reads these via `.prompt.md`.
- Reviewers (and `wp-verifier`) reject interactive elements without a persistent signifier and a `:focus-visible` style.
- The Claude Design brief (`docs/design/claude-design-prompt.md`) carries this as a hard constraint.
