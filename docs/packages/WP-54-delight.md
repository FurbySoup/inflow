# WP-54 — Delight: warning-aware tab title and favicon; panel lights "power on"
Wave 13 · ADRs: 0012, 0015, 0018, 0019 · Source: `docs/polish-plan.md`

## Goal
Two small moments, both from real data only:
1. From another browser tab, you can see that a warning is active in your area, in the tab title and favicon.
2. At first load, each panel's status light flashes once as its feed actually answers, like a console powering on.

Neither may ever imply safety ("all clear"), invent delays, or look playful during a tornado warning.

## Owns
- new `src/panels/useWarningTitle.ts` (+ `useWarningTitle.test.ts`); new `src/panels/warningTitle.ts` (pure helpers + test)
- `src/panels/Topbar.tsx`: **one line only**, a call to `useWarningTitle()` inside the `Topbar` component
- `src/ui/css/led.css` (kit CSS: the power-on animation and its suppression)
- `.design-sync/previews/StatusLed.tsx` (if the preview needs the new state shown)

## Forbidden
`src/ui/*.tsx` (including `StatusLed.tsx`), every other file in `src/ui/css/`, `src/index.css`, `src/state/*`, `src/lib/*`, `src/notify/**`, `index.html`, `public/*`. If one must change, stop and report.

## Verified facts (on `main`, 2026-10-17)
- **`threatSummary(alerts, { bbox, states }, now)`** (`src/panels/threat.ts`) returns `{ count, pdsCount, nextExpiryMs, target }` for active **TOR** warnings that intersect the AOI, with expired ones dropped. `ThreatButton.tsx` uses it with `useSource(nwsAlerts)` and `useAoi`.
  - `hazardCode(event)` (`src/ui/hazard.ts`) maps an event name to `TOR`, `SVR`, `FFW`, ….
  - `src/panels/aoiMatch.ts` has the AOI matching that `threatSummary` uses.
  - **For SVR, reuse it, don't re-implement it:** call `threatSummary` on the alerts with the TOR filter swapped. If `threat.ts` can't be reused, write a tiny pure `countInAoi(alerts, aoi, now, code)` in `warningTitle.ts` using `src/panels/aoiMatch.ts`.
- **`useSource(nwsAlerts)`** is a TanStack Query hook. Calling it in a second component shares the same cache, with no extra fetch.
- **The favicon** is `/favicon.svg` (`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`). Its content is a 16×16 viewBox: `<rect width="16" height="16" fill="#0D1115"/>`, an accent reticle path and a centre square.
- **The base title** is `INFLOW`.
- **The LEDs:** `StatusLed` renders `<span class="led" data-status="live|loading|stale|error|offline">`. `led.css` animates `[data-status="live"]` with `inflow-pulse` and `[data-status="loading"]` with `inflow-spin`. Reduced motion already disables those somewhere in the kit; check `base.css` / `led.css`.

## Build
- **`warningTitle.ts` (pure):**
  - `titleFor({ tor, svr })`: `INFLOW` when both are 0; `(2 TOR) INFLOW`; `(1 TOR · 3 SVR) INFLOW`; `(3 SVR) INFLOW`.
  - Never words like "clear", "safe" or "none".
  - `badgedFavicon(svgText, level)`: returns the SVG text with a filled circle appended before `</svg>`, at the bottom-right (cx 12.5, cy 12.5, r 3.5). The fill is the TOR hazard colour for `level === 'tor'` and the SVR colour for `'svr'`. The colours are MapLibre-style literal values, which is allowed for non-CSS paint: read the existing hex from `src/map/mapStyle.ts` `HAZARD`, don't invent one.
  - `level` null returns the text unchanged.
- **`useWarningTitle()`:**
  - reads `useSource(nwsAlerts)` and `useAoi`;
  - re-evaluates every 30 s and on data change;
  - sets `document.title`;
  - swaps the `link[rel="icon"]` href to a `data:image/svg+xml,…` URL built from the original `/favicon.svg` text, fetched once and cached in module scope. On a fetch failure it skips the favicon and keeps the title.
  - It restores the original href and the `INFLOW` title when counts return to 0 and on unmount.
  - While the feed is pending or errored, it leaves the title as `INFLOW`. It never claims anything without data.
  - It also sets `document.documentElement.dataset.tor = 'active'` when TOR > 0, and deletes it otherwise. The LED rule below uses it.
- **Power-on (`led.css` only):**
  - when an LED becomes `live`, play a one-shot ~300 ms brighten (a brief brighter background or box-shadow flare, then settle) before the existing pulse. Chain them: `animation: inflow-poweron 300ms var(--ease-out) 1, inflow-pulse var(--dur-led-pulse) var(--ease-in-out) 300ms infinite;`, using tokens only;
  - this naturally happens on each feed's real arrival, with no JS, no fake stagger and nothing held back;
  - `:root[data-tor="active"] .led[data-status="live"]` drops the power-on, keeping only the pulse;
  - `@media (prefers-reduced-motion: reduce)` disables it as well.
  - The base `.led` / `.led-live` used by the map LayerControl must not change.
- **Design sync:** the kit changed (`led.css`), so note in your report that a `/design-sync` re-run is needed. Don't run it.

## Acceptance
- [ ] `warningTitle.test.ts`:
  - every `titleFor` case;
  - no output contains "clear", "safe" or "none" for any input;
  - `badgedFavicon` keeps the original SVG, adds exactly one circle before `</svg>`, uses the `HAZARD` hex, and leaves the text unchanged for null.
- [ ] `useWarningTitle.test.ts` (mock `useSource` and `fetch`):
  - pending → `INFLOW`;
  - 1 TOR in the AOI → `(1 TOR) INFLOW`, a `data:` icon href and `data-tor="active"`;
  - a TOR outside the AOI → `INFLOW`;
  - counts back to 0 → the original href restored and `data-tor` removed;
  - a favicon fetch failure → the title still updates;
  - unmount restores everything.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass (`build:ui` covers `led.css`).
