# design-sync notes — storm-chasers

- The synced design system is the **UI kit in `src/ui/`** (not the whole app). Build it with `npm run build:ui` → `dist/ui/index.js` + `.d.ts`; pass `--entry ./dist/ui/index.js --node-modules ./node_modules`.
- Styling: INFLOW v1 tokens in `src/ui/tokens.css` (from the Claude Design handoff, `docs/design/inflow-v1/`) + component classes in `src/ui/styles.css`. The app imports both from `src/index.css`. The converter doesn't follow relative `@import`s, so `npm run build:ui` concatenates them into `dist/ui/kit.css` (`scripts/kit-css.mjs`), which is `cfg.cssEntry`. Never point cssEntry back at `src/ui/styles.css` alone (tokens would be missing: `[TOKENS_MISSING]`, `[CSS_IMPORT_MISSING]`).
- **Fonts (2026-10-11):** IBM Plex Sans Condensed + IBM Plex Mono via the Google Fonts `@import` at the top of tokens.css. `[FONT_REMOTE]` is expected. The 2026-10-10 "system fonts" decision is superseded.
- Guidelines are limited to the design ADRs (0007 mission-control UI, 0012 Norman signifiers) via `guidelinesGlob`. The default pulled in internal planning docs (roadmap, work plan).
- Playwright for the render check: `.ds-sync` uses `playwright@1.61.1`, which pins the cached `chromium-1228` in `%LOCALAPPDATA%/ms-playwright`.
- Windows/Git Bash: write files with the editor tools, not heredocs or `node -e` with template literals (backticks get mangled).

- First sync 2026-10-10 → project `Storm Chasers UI` (c3cc7036-…). 8 components, all authored + graded good, 6 build/capture iterations.
- Fixes found by the sync that changed the kit itself: background moved from `:root` to `body` (cards showed a dark html canvas below short stories); `.cam-tile` gets `width: 100%` (standalone tiles overflowed on long captions); `ConsoleButton[aria-pressed]` is a solid accent fill (pressed state was barely visible).
- Wide stories use `cardMode: "column"` (AlertList, AlertRow, CameraTile, Panel, StreamTile). They triggered `[GRID_OVERFLOW]`.
- Re-sync: `npm run build:ui`, re-copy the scripts into `.ds-sync/`, fetch `_ds_sync.json` → `.design-sync/.cache/remote-sync.json`, then `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./dist/ui/index.js --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`.

- 2026-10-11 Wave 7 re-sync: Toast added (`cardMode: column`, it was wider than grid cells). AlertList/AlertRow/Panel/StatusLed/StreamTile previews were rewritten by the design wave and graded good.
- The kit must not import app code: `src/ui/hazard.ts` holds the event → hazard code mapping; `src/lib/hazards.ts` re-exports it. `npm run build:ui` fails (TS6059 rootDir) if a kit file imports `src/lib`.

- 2026-10-11 Wave 8 re-sync: StreamTile gained `liveKind`/`playing`/`onPlay`/`onStop` (WP-33) and the Badge PDS variant is white-filled; 9 components, StreamTile regraded good, the other 8 verified-by-upload.
- **StreamTile previews and YouTube:** `package-capture.mjs` waits for `networkidle` (20 s). An embed with `autoplay=1` streams forever and times out every capture (`[CAPTURE] page.goto: Timeout`). Preview embeds therefore never autoplay; keep at most 2 YouTube players in the file (Primary + ReplayPlaying), and the sound-on primary cell was dropped for that reason.

## Known render warns
- `[FONT_REMOTE]` for IBM Plex: expected (Google Fonts import).

## Re-sync risks
- Fonts load from fonts.googleapis.com at runtime; cards render in fallback fonts if that host is blocked.
- Preview data (alert names, stream titles, camera names) is illustrative, taken from the 2026-10-10 GA/SC outbreak. It isn't tied to live feeds.
- StreamTile previews embed a real YouTube video URL. If that broadcast is removed, the card shows YouTube's unavailable state; swap the id in `.design-sync/previews/StreamTile.tsx`.
