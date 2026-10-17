# WP-53 — Copy and consistency pass (orchestrator)
Wave 13 · Source: `docs/polish-plan.md` · Done by the orchestrator on `main` in commit 520d799 (prep), not by a builder.

## What changed
- **Stream slots:** "CAM 01" became "FEED 01". CAM collided with the DOT cameras, so the `CAM` glossary entry is gone.
- **Sound toggle:** 🔊/🔇 became plain "SOUND ON" / "MUTED", because it was the only colour emoji in the UI.
- **Countdowns:** from one hour they read `T-2h18` (no ticking seconds); under an hour they stay `T-mm:ss`.
- **Layer labels:** they render as one span, which removes the stray spaces around abbreviations ("VELOCITY ( SRV , …)").
- **Glossary:**
  - removed the unused `V2` entry;
  - merged THUMB and THUMBS;
  - SE no longer claims to be the default; PLAINS says it is.
- **Wording:**
  - ABOUT says "best-effort", not "community-maintained";
  - NOTIFY says "Works only while this tab is open";
  - `src/panels/help/startHere.ts` holds the START HERE content (for WP-52).
- **README:**
  - removed the broken screenshot line (add it back with a real capture);
  - added a quiet-day line;
  - `?` HELP is now described as starting with START HERE.
- **Launch posts:** the counts match the repo (58 chasers), and the r/selfhosted and r/ClaudeAI titles are rewritten, with no "dashboard".
