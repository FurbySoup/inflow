# WP-41 — Roster scheduler re-arms when the tab becomes visible
Wave 10 · Follows WP-36 · ADRs: 0010, 0013

## Goal
The roster scheduler (`src/sources/chasers/scheduler.ts`) paces checks with `stepMs(visible)`: 10 s visible, 60 s hidden. The wait is computed when the timer is set. So after the tab comes back to the front, the pending hidden-pace timer can still hold the next check for up to 60 s, and LIVE NOW lags. Re-arm on `visibilitychange`.

## Owns
`src/sources/chasers/scheduler.ts` (+ `scheduler.test.ts`), `src/sources/chasers/useRoster.ts`.

## Forbidden
Everything else. In particular `src/state/*`, `src/lib/*`, `src/ui/*`, `config/chasers.json` (orchestrator-owned), `StreamsGrid.tsx`, `LiveNow.tsx`.

## Verified facts (code on `main`, 2026-10-13)
- `createScheduler(deps)` runs one check at a time. After each check, `tick` sets `timer = setTimeout(tick, max(0, stepMs(deps.visible()) - elapsed))`.
- `stop()` bumps `session`, clears `timer` and aborts the in-flight `controller`. A stale `tick` returns early when its `current !== session`. Keep that guard intact.
- `defaultDeps` reads `document.visibilityState === 'visible'`.
- The liveness budget (ADR-0013) is one check per step: 6/min visible, 1/min hidden. Re-arming may cause at most one extra check on each hidden→visible change. It must never start a second concurrent check.

## Build
- Add an injectable dependency `onVisible(listener: () => void): () => void` to `SchedulerDeps`.
  - `defaultDeps` implements it with `document.addEventListener('visibilitychange', …)`, calling the listener only when `visibilityState === 'visible'`.
  - It returns the remover.
- `start()` subscribes; `stop()` unsubscribes.
- On visible: if a `timer` is pending (no request in flight, i.e. `controller === undefined`) **and** that timer was armed with the hidden step, clear it and tick now in the current session.
  - If a check is in flight, do nothing: its own completion arms the next step with the visible pace.
- Keep the module's JSDoc style. Add a one-line comment on why re-arm exists.
- `useRoster.ts` should need no change. If it does, keep it minimal.

## Acceptance
- [ ] Tests with fake timers and fake deps:
  - hidden pace pending → visible event → `check` is called at once (not after 60 s);
  - a visible event while a check is in flight starts no second check;
  - a visible event after `stop()` does nothing, and the listener is removed;
  - a visible event while the pending timer is already at the visible pace does nothing extra.
- [ ] Existing scheduler tests still pass unchanged.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
