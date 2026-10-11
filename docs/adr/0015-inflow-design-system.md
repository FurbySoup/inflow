# 0015. INFLOW v1 design system and design-wave ownership
Status: Accepted
Date: 2026-10-11
Amends: 0007 (tokens), 0010 (ownership of `src/ui/*` during design waves).

## Context
The user ran the Claude Design brief (`docs/design/claude-design-prompt.md`), which returned the handoff "INFLOW v1" (`docs/design/inflow-v1/HANDOFF.md`).
- **What it contains:**
  - a rebrand: the product becomes INFLOW, because "Storm Chasers" is a TV series name;
  - a production `tokens.css` with primitives, semantic tokens, legacy aliases, layout presets and motion;
  - IBM Plex fonts;
  - component specs (§6), map styling (§7), motion (§8) and a list of new markup (§9).
- **Implementing §9 means many kit components change at once.** Under ADR-0010 all of `src/ui/*` is orchestrator-only, which would serialise the whole wave.

## Decision
- **Tokens are the source of truth.**
  - `src/ui/tokens.css` is the handoff file, minus a self-referencing `--accent` alias that would invalidate the accent.
  - Components use semantic tokens (`--surface-*`, `--text-*`, `--status-*`, `--hz-*`, `--accent*`).
  - Legacy names remain as aliases until call sites migrate.
- **Brand:** INFLOW wordmark plus the AOI-reticle mark (direction 1a). Repo and package names stay `storm-chasers` until trademark clearance; that's an open item in the handoff.
- **Fonts:** IBM Plex Sans Condensed and IBM Plex Mono via Google Fonts (OFL).
- **Kit CSS is one file per component** (`src/ui/css/*.css`), imported by `src/ui/styles.css`.
- **Design-wave ownership (amends 0010):**
  - A design-wave package may own named kit components: the `.tsx`, its `css/*.css` file and its `.design-sync/previews/<Name>.tsx`.
  - Each such file has exactly one owner per wave.
  - `tokens.css`, `index.ts` exports and `src/ui/format.ts` stay orchestrator-only.
  - A new kit component is created by its owning package; the orchestrator adds the `index.ts` export at merge.
- **Shared rules live in `src/lib/hazards.ts`**, so rows, the threat button, toasts and the map can't drift: hazard codes, PDS/emergency detection and sort order.
- **Hazard and map colours:**
  - MapLibre paint keeps literal hex values (it can't read CSS variables).
  - They must equal the token primitives (`--p-nws-*`, `--p-spc-*`, `--p-report-*`).
- **After a design wave the kit is re-synced to Claude Design.**

## Consequences
- **New ADRs vs the handoff:** the handoff's "never" rules (§1, §7) become review criteria for verifiers. Examples: no brand in hazard colours; nothing flashes faster than 1 Hz; ice accent is never a fill on the map.
- **Imagery isn't validated yet.** Mock imagery in the handoff is synthetic, so overlay colours must be checked against real NEXRAD and GOES imagery (an open item).
- **Google Fonts makes an external request.** That's acceptable for v1. Revisit self-hosting for v2 privacy and CSP.
