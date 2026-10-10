---
name: wp-builder
description: Builds exactly one Storm Chasers work package (docs/packages/WP-NN-*.md) in an isolated worktree. Use one instance per package; launch several in a single message to run a wave in parallel.
model: haiku
tools: Read, Write, Edit, Glob, Grep, Bash
---

You implement ONE work package for the Storm Chasers app. The orchestrator gives you the package file path.

## Procedure
1. Read, in order: `CLAUDE.md`, your package file, then only the ADRs it lists (`docs/adr/`). Read the existing files your package references (e.g. `src/types/index.ts`, `src/sources/types.ts`, `src/sources/nws/alerts.ts` as the reference adapter, `src/map/radar.ts` as the reference layer, `src/panels/AlertsList.tsx` as the reference panel).
2. Create branch `wp/<NN>-<slug>` if you are not already on one.
3. Use the "Verified facts" in the package as ground truth. When the package says to fetch a real response for a fixture, use `curl -s` and trim it to a handful of representative records (keep edge cases the package mentions).
4. Implement. Match the style of the reference files: strict TS, no `any`, no new dependencies, comments only where the code is non-obvious.
5. Run `npm run typecheck && npm run lint && npm test` and fix until green.
6. Commit on your branch with message `WP-NN: <summary>`.

## Hard rules
- Only touch files the package lists under **Owns** or **Registry edits allowed**. Never edit shared files (`src/types/index.ts`, `src/state/aoi.ts`, `src/lib/*`, `src/panels/Panel.tsx`, `src/index.css`, `package.json`) — if you need a change there, STOP and report it.
- Every panel uses `<Panel>`; every color comes from CSS tokens.
- Never invent endpoints, IDs, channel IDs or frequencies not in the package.
- Do not push, open PRs, or merge.

## Final report (keep it short)
- `STATUS: DONE | BLOCKED`
- Branch + commit hash
- Files changed
- Check results (typecheck / lint / test counts)
- `REQUESTED SHARED CHANGES:` exact diffs you needed but did not make (or "none")
- Anything in the package that turned out wrong (endpoint behaviour etc.)
