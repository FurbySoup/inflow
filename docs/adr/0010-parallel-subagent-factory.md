# 0010. Parallel build via Haiku sub-agent factory
Status: Accepted
Date: 2026-10-10

## Context
v1 has ~9 independent features. Building them in parallel with small, cheap, fast models (Haiku 5.5) is efficient only if each unit of work is small, fully specified and isolated from the others.

## Decision
- **Orchestrator** = the main Claude Code session (Opus). It owns shared files, writes work-package specs, launches builders, merges.
- **Builders** = `.claude/agents/wp-builder.md` (`model: haiku`), one per work package, each in its own git worktree (`isolation: "worktree"`) on branch `wp/<NN>-<slug>`.
- **Verifiers** = `.claude/agents/wp-verifier.md` (`model: haiku`, read-only + checks), one per finished package; checks acceptance criteria and ADR conformance and returns PASS/FAIL with reasons.
- **Work packages** live in `docs/packages/WP-NN-*.md`, each self-contained: goal, files owned, files forbidden, verified endpoint facts, types to use, acceptance criteria, test command. A builder reads only its package + `CLAUDE.md` + referenced ADRs.
- **Ownership rules:**
  - Shared files — `src/types/index.ts`, `src/state/aoi.ts`, `src/lib/*`, `src/panels/Panel.tsx`, `src/index.css` tokens, `vite.config.ts`, `package.json` — are orchestrator-only. A builder that needs a change there stops and reports the requested change instead of making it.
  - Exception: explicitly listed "one-line registry edits" (`src/map/layers.ts` array, an `App.tsx` placeholder swap, a `vite.config.ts` proxy entry) are allowed and resolved at merge.
- **Waves** (see `docs/work-plan.md`): packages in the same wave have no file overlap and run concurrently; later waves depend on earlier merges.
- **Gate:** a package merges only when `npm run typecheck && npm run lint && npm test` pass in its worktree and the verifier returns PASS.

## Consequences
- Specs must carry verified facts (endpoints, quirks) so Haiku never has to research or guess.
- Shared-type changes serialize through the orchestrator — slower, but prevents drift across parallel branches.
- The orchestrator does a final live check in the browser against the current AOI after each wave.
