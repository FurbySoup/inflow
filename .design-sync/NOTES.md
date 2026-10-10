# design-sync notes — storm-chasers

- The synced design system is the **UI kit in `src/ui/`** (not the whole app). Build it with `npm run build:ui` → `dist/ui/index.js` + `.d.ts`; pass `--entry ./dist/ui/index.js --node-modules ./node_modules`.
- Styling is a token + class system in `src/ui/styles.css` (`cfg.cssEntry`). The app imports the same file from `src/index.css`, so app and design system can't drift.
- **Fonts: system stacks by decision (user, 2026-10-10).** `--font-ui` is Segoe UI/system-ui; `--font-data` is ui-monospace/Cascadia Mono/SF Mono/Consolas. No font files ship. `[FONT_MISSING] "Cascadia Mono"` is expected and accepted. If the Claude Design brand work picks brand fonts, add them via `cfg.extraFonts` and drop this note.
- Guidelines are limited to the design ADRs (0007 mission-control UI, 0012 Norman signifiers) via `guidelinesGlob`. The default pulled in internal planning docs (roadmap, work plan).
- Playwright for the render check: `.ds-sync` uses `playwright@1.61.1`, which pins the cached `chromium-1228` in `%LOCALAPPDATA%/ms-playwright`.
- Windows/Git Bash: write files with the editor tools, not heredocs or `node -e` with template literals (backticks get mangled).

- First sync 2026-10-10 → project `Storm Chasers UI` (c3cc7036-…). 8 components, all authored + graded good, 6 build/capture iterations.
- Fixes found by the sync that changed the kit itself: background moved from `:root` to `body` (cards showed a dark html canvas below short stories); `.cam-tile` gets `width: 100%` (standalone tiles overflowed on long captions); `ConsoleButton[aria-pressed]` is a solid accent fill (pressed state was barely visible).
- Wide stories use `cardMode: "column"` (AlertList, AlertRow, CameraTile, Panel, StreamTile). They triggered `[GRID_OVERFLOW]`.
- Re-sync: `npm run build:ui`, re-copy the scripts into `.ds-sync/`, fetch `_ds_sync.json` → `.design-sync/.cache/remote-sync.json`, then `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./dist/ui/index.js --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`.

## Known render warns
- `[FONT_MISSING] "Cascadia Mono"`: accepted, system font stacks by decision (see above).

## Re-sync risks
- Preview data (alert names, stream titles, camera names) is illustrative, taken from the 2026-10-10 GA/SC outbreak. It isn't tied to live feeds.
- StreamTile previews embed a real YouTube video URL. If that broadcast is removed, the card shows YouTube's unavailable state; swap the id in `.design-sync/previews/StreamTile.tsx`.
