# WP-20 — Shape-coded status LEDs + data age in every panel header
Wave 7 · Depends on prep P7b · ADRs: 0012, 0014, **0015** · Spec: HANDOFF.md §2 (feed status), §6 (panel header, status LED), §9 items 4 + 10 (data age); `Console.dc.html` ~line 365 (`LED()` mapping)

## Goal
Feed health must not rely on colour alone. LEDs carry shape, and each panel header shows how old its data is.

## Owns (ADR-0015)
- Kit: `src/ui/StatusLed.tsx`, `src/ui/Panel.tsx`, `src/ui/css/led.css`, `src/ui/css/panel.css`, `.design-sync/previews/StatusLed.tsx`, `.design-sync/previews/Panel.tsx`.
- App: `src/panels/Panel.tsx` (wrapper), `src/lib/feedStatus.ts` (+ test). This package is its only owner in Wave 7.

## Forbidden
Individual panels (`AlertsList`, `StreamsGrid`, `AudioPanel`, `CamerasPanel`, `MapPanel`): other packages own them. The design must work **without editing them**: they already pass `status={queryStatus(query)}`.

## Build
- **StatusLed:**
  - `data-status` attribute;
  - shape drawn in CSS: live ● (filled, `--status-live`, 2 s `inflow-pulse` halo), loading ◌ (ring, `inflow-spin`), stale ◐ (half fill, `--status-stale`), error ■ (square, `--status-error`), offline ○ (ring, `--status-offline`);
  - size `fs-data-xs × .75`, read-only, no border;
  - `aria-label` = state plus age when known (e.g. "live, updated 12 s ago").
- **feedStatus:**
  - `queryStatus(q)` keeps returning a `FeedStatus` for existing callers.
  - Add `queryFeed(q)` → `{ status, updatedAt }`, using TanStack's `dataUpdatedAt`.
  - Make the Panel wrapper accept either form. Prefer the smallest change: if `status` is a `FeedState` object, derive the age.
  - Mark a feed stale when it is older than 3× its refresh interval, if the caller passes `refreshMs`, else leave it.
- **Panel header** (kit):
  - LED · CODE · TITLE · meta · age · ▾/▸ collapse button (22 px, bordered = control);
  - age format `12s` / `4m05s` in `--font-data`, tabular-nums, `--text-muted`, sand (`--status-stale`) when stale;
  - the wrapper ticks the age once a second only while mounted and visible.
- Panel header height `--panel-head-h`; codes Mono 500 tracking `--tr-code`, `--text-muted`; titles Sans 600 uppercase tracking `--tr-label`.
- Update the previews: every LED state, and a panel header with age (static values).

## Acceptance
- [ ] Tests: age formatting, stale threshold, `queryFeed` mapping, wrapper accepting both status forms.
- [ ] Panels that pass `queryStatus(query)` today show an age with no edits to those panel files. For them, wire the age through a `useSource`-returned object only if `queryStatus` can't see `dataUpdatedAt`. If it can't, report the minimal shared change rather than editing panels.
- [ ] LED shapes stay distinguishable in greyscale (colour-blind check per HANDOFF §2).
- [ ] Orchestrator live check: ages tick, and LEDs change shape when `/api/nws` is blocked.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
