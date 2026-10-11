# WP-24 — New-tornado-warning toasts
Wave 7 · Depends on prep P7a · ADRs: 0003, 0012, 0014, **0015** · Spec: HANDOFF.md §6 (new-TOR toast), §8 (motion); `Console.dc.html` ~lines 117-130 (markup), 487 + 502 (rules)

## Goal
When a new tornado warning (TOR, or a Tornado Emergency) is issued for the AOI, show an in-app toast that can focus the map. Wave 9's notification engine reuses this diff for browser notifications.

## Owns (ADR-0015)
- Kit (new): `src/ui/Toast.tsx`, `src/ui/css/toast.css` (the orchestrator adds the `index.ts` export and the `styles.css` import at merge, so report the lines), `.design-sync/previews/Toast.tsx`.
- App: `src/panels/ToastRegion.tsx`, `src/panels/newAlerts.ts` (pure diff) + `newAlerts.test.ts`.

Registry edit allowed: mount `<ToastRegion />` once in `src/App.tsx`.

## Forbidden
`src/state/*`, `src/lib/*` (use `hazards.ts`), other panels.

## Build
- **`newAlerts.ts`** (pure):
  - `diffNewTornadoWarnings(prevIds, alerts, aoiStates)` returns alerts that are `hazardCode === 'TOR'` (includes emergencies via `damageThreat`), in the AOI, and not in `prevIds`;
  - the first call after load seeds `prevIds` and never toasts existing warnings.
- **Toast** (kit), `role="alert"`:
  - hazard block (TOR red, `▼ TOR`; Emergency adds `EMERGENCY`; PDS gets the white ring);
  - `NEW IN AOI · SOURCE NWS · <issued Z>`;
  - title + area;
  - countdown to expiry;
  - `⌖ FOCUS MAP` (primary) and `DISMISS ✕` (quiet).
  - Motion: 240 ms `inflow-arrive`, then 3× 1 Hz outline. Under reduced motion it appears in place with a static double outline.
- **ToastRegion:**
  - fixed top-centre over the map, `min(600px, 100% - 24px)`, max 3 stacked (oldest drops);
  - auto-dismiss only when the warning expires or is cancelled; it never times out while active;
  - FOCUS sets `useAoi.setFocus` to the polygon bbox (use `geometryBbox` read-only from `src/panels/alertGeometry.ts`).
- Voice rules (HANDOFF §1): NWS products only. Never call non-NWS signals alerts/warnings; no emoji or exclamation marks.

## Acceptance
- [ ] Tests:
  - seeding on first load;
  - new TOR in the AOI → one toast;
  - outside the AOI → none;
  - SVR → none;
  - the same id again → none;
  - max-3 stacking.
- [ ] Focus moves to the toast's ⌖ button without stealing focus from inputs (`aria-live` via role=alert only).
- [ ] Orchestrator live check: simulate by stubbing the adapter response in DevTools (or a dev-only query param, removed before merge); check at 390×844.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
