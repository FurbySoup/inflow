# 0020. Ship 1.0 as a self-run app, not a hosted service
Status: Proposed
Date: 2026-10-17

## Context
The maintainer wants a release that needs no ongoing attention. A hosted deployment (roadmap v2) means paying for it, watching it, rate-limiting it, and carrying redistribution terms for every upstream (IEM, DOT feeds, YouTube) on the maintainer's name.

The app is not a static page either. About 20 upstreams need the same-origin `/api/*` proxy (ADR-0005), which today exists only in `vite dev`.

## Decision
- **1.0 is self-run.** Each user runs INFLOW on their own machine or home server. Their browser and their server fetch the upstreams directly. Nothing is hosted by the maintainer.
- **One route table.** Move the proxy table out of `vite.config.ts` into `proxy/routes.ts`. The Vite dev server and a small production server both read it.
- **Production server** (`server/`, Node ≥ 20, no runtime dependencies beyond Node):
  - serves `dist/` and the `/api/*` routes;
  - only allowlisted upstream hosts, with a fixed host per prefix;
  - only GET, plus POST for the CARS GraphQL routes;
  - strips cookies;
  - an in-memory cache at upstream cadence;
  - binds `127.0.0.1` by default; `HOST=0.0.0.0` is an explicit opt-in for LAN or wall displays.
- **Two ways to run, both built from a tagged release by GitHub Actions:**
  - `npm start` from a clone;
  - a Docker image on GHCR.
- **Optional later:** `npx` and a "Deploy to Cloudflare" button. They're not part of 1.0 (see Consequences).
- **Ruled out:** maintainer-hosted service, and desktop app wrappers (code signing and auto-update are ongoing work).

## Consequences
- Roadmap v2 (hosted) becomes optional. The terms gate shrinks to personal-use self-hosting, and the README states it plainly: "you run it, you fetch the data, for personal use".
- ADR-0005's "proxied sources fail in static builds" no longer holds once the server exists.
- The NWS User-Agent becomes configurable (`NWS_CONTACT` env), with the repo URL as the default.
- **Why a Deploy-to-Cloudflare button waits:** it would put a public proxy on the user's account. YouTube and some DOT hosts may block datacenter IPs. And the terms gate comes back for anything public.
