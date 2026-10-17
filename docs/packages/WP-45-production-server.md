# WP-45 — Production server (`server/`)
Wave 11 · ADRs: 0005, 0020

## Goal
A small Node server that serves the built app (`dist/`) and the `/api/*` proxy routes from the shared table in `proxy/routes.ts`. It's what `npm start` and the Docker image run. It has **no runtime dependencies** beyond Node ≥ 20 (`node:http`, `node:fs`, global `fetch`). It must never be an open proxy.

## Owns
- `server/**` (new): `server/index.ts` (entry: reads env, starts listening), plus modules such as `server/app.ts` (request handler factory), `server/proxy.ts`, `server/cache.ts`, `server/static.ts`, and their `*.test.ts`.

## Forbidden
`proxy/routes.ts` (read it, don't edit it), `vite.config.ts`, `package.json`, `tsconfig*.json`, everything under `src/`. If one must change, stop and report the exact diff.

## Verified facts (on `main`, 2026-10-17)
- `proxy/routes.ts` exports `proxyRoutes(env)`, `matchRoute(routes, path)`, `nwsUserAgent()` and the `ProxyRoute` type (`prefix`, `target` origin, `upstreamPath`, `methods`, `headers?`, `cacheSeconds`). Read its header comment: it states the rules you enforce.
- Upstream URL = `target + upstreamPath + (request path after prefix) + query`. Example: `/api/kandrive/graphql` → `https://www.kandrive.gov/api/graphql`.
- `npm run build:server` already exists: `vite build --ssr server/index.ts --outDir dist-server`. So `server/index.ts` is the entry. It's bundled to `dist-server/index.js` and run with `node dist-server/index.js`. Node built-ins stay external. Import with relative paths (`../proxy/routes`).
- `dist/` is the `npm run build` output (`index.html` + `assets/`). It's a single page with no client routes, so serve `index.html` for `/` only. Unknown non-API paths get 404.
- **CARS routes** (`/api/kandrive`, `/api/ne511`, `/api/511ia`, `/api/511mn`, `/api/511in`) receive JSON POSTs: `Content-Type: application/json`, `Accept: application/json`, with a small GraphQL body. The body must be forwarded. Cap it at 64 KB (413 above that).
- **YouTube** (`/api/youtube`) and some 511 hosts answer with redirects. Use `fetch(url, { redirect: 'manual' })` and pass the 3xx status plus `Location` back unchanged. Never follow a redirect server-side, since that could reach another host.
- Node's `fetch` decompresses bodies. Drop `content-encoding`, `content-length` and `transfer-encoding` from upstream responses before you send them on.
- The tsconfig for `server/` is `tsconfig.node.json` (strict, `types: ["node"]`, `erasableSyntaxOnly`, so no enums or parameter properties). Vitest already includes `server/**/*.test.ts`. Tests run in jsdom by default, so start each server test file with `// @vitest-environment node`.

## Build
- **Env (`server/index.ts`):**
  - `PORT` (default `8080`);
  - `HOST` (default `127.0.0.1`);
  - `NWS_CONTACT`, passed to `proxyRoutes({ NWS_CONTACT })`.
  - On listen, log one line: `INFLOW listening on http://<host>:<port>`. When the host is `0.0.0.0`, add `(LAN: reachable from other devices)`.
- **Handler factory:** export `createApp({ routes, distDir, fetchImpl = fetch, now = Date.now })` that returns the `(req, res)` handler. Tests inject `fetchImpl` and never touch the network.
- **Request path:** parse with `new URL(req.url, 'http://localhost')` and use only `pathname` + `search`. Reject (400) any `req.url` that doesn't start with `/`, such as absolute-form `http://evil.example/`.
- **Proxy rules** (every one gets a test):
  1. `matchRoute` decides the route. No match under `/api/` → 404.
  2. Method not in `route.methods` → 405 with an `Allow` header. Answer `OPTIONS` with 405 too: same-origin requests never preflight.
  3. Build the upstream `URL`, then **assert `url.origin === route.target`**, or return 400. This catches `..%2f`, `//evil.example`, `@` and backslash tricks.
  4. Request headers sent upstream, an allowlist only:
     - `accept`;
     - `accept-language`;
     - `content-type` (POST only);
     - `if-none-match` / `if-modified-since`;
     - then the route's `headers`, which win.
     - Never forward `cookie`, `authorization`, `host`, `origin`, `referer` or any `x-forwarded-*`. Set `user-agent` only from route headers; otherwise use `INFLOW storm-chasers` + repo URL (import `REPO_URL`).
  5. Response headers passed back, an allowlist:
     - `content-type`;
     - `cache-control`;
     - `etag`;
     - `last-modified`;
     - `location` (3xx only);
     - `expires`.
     - Never pass `set-cookie`.
  6. Upstream network error or timeout (15 s, `AbortSignal.timeout`) → 502. The panel LED handles it.
- **Cache** (`server/cache.ts`): in-memory, GET only, keyed by the full upstream URL.
  - Store only 200 responses with a body under 5 MB, for `route.cacheSeconds`.
  - Cap the cache at 500 entries, evicting the oldest first.
  - Coalesce concurrent misses for the same key into one upstream fetch.
  - Tests use the injected `now`.
- **Static** (`server/static.ts`):
  - serve files from `distDir` with the right `content-type` (html, js, css, json, svg, png, ico, woff2, map, webmanifest; otherwise `application/octet-stream`);
  - resolve the path and refuse anything outside `distDir` (test `/../package.json` and `/%2e%2e/package.json`);
  - `assets/*` gets `Cache-Control: public, max-age=31536000, immutable`; `index.html` gets `no-cache`;
  - GET and HEAD only.
- **On every response:**
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `X-Frame-Options: SAMEORIGIN`.
  - **Not** a CSP; that's post-1.0.
- **`GET /healthz`** → 200 `ok` (text/plain), for the Docker `HEALTHCHECK`.
- Short header comment in each module. No `any`.

## Acceptance
- [ ] Tests (node environment, injected `fetchImpl`), covering at least:
  - route mapping, including the query string and `upstreamPath` (`/api/kandrive/x` → `https://www.kandrive.gov/api/x`);
  - **not an open proxy:** `/api/nws/..%2f..%2fevil`, `/api/nws//evil.example/x`, absolute-form `req.url`, `/api/unknown/x` and `/api/nwsx` never call `fetchImpl` with a non-allowlisted origin (assert on every URL the fake saw);
  - POST to `/api/nws` → 405; POST to `/api/kandrive/...` forwards the body and `content-type`;
  - cookies and `authorization` are not forwarded; `set-cookie` is not returned;
  - the NWS User-Agent comes from the route;
  - cache hit within `cacheSeconds`, miss after, no cache for POST or non-200, concurrent misses → one fetch;
  - 3xx passes through without being followed;
  - upstream failure → 502;
  - static: index, an asset with the immutable cache header, traversal refused, 404 for an unknown path;
  - security headers on a static response, a proxy response and an error response;
  - `/healthz`.
  - Spin up a real `http.createServer(createApp(...))` on port 0 for at least the traversal and header tests.
- [ ] The bundled server starts and serves. Run this exact command once (no browser, nothing left running):
  `npm run build && npm run build:server && (PORT=8099 timeout 8 node dist-server/index.js & sleep 3; curl -sI http://127.0.0.1:8099/ | head -5; curl -s http://127.0.0.1:8099/healthz; wait) || true`
  Report its output.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
