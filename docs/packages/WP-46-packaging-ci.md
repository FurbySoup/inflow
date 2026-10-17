# WP-46 — Packaging, CI and release (`npm start`, Docker, GitHub Actions)
Wave 11 · ADRs: 0020

## Goal
A stranger can run INFLOW with one command (Docker) or three (`git clone`, `npm ci`, `npm start`). A `v*` tag publishes the image to GHCR and a ready-to-run zip to GitHub Releases, with no manual steps. CI runs the gate on every PR and push to `main`. It's built to need **no maintenance**: no third-party actions beyond the official `actions/*` and `docker/*` ones, and no scheduled jobs.

## Owns (all new)
- `scripts/start.mjs`
- `Dockerfile`, `.dockerignore`
- `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- `.github/ISSUE_TEMPLATE/source-broken.yml`, `.github/ISSUE_TEMPLATE/feature-idea.yml`, `.github/ISSUE_TEMPLATE/config.yml`
- `SECURITY.md`, `CONTRIBUTING.md`

## Forbidden
`package.json` (the scripts below already exist), `server/**` (WP-45 is building it in parallel), `src/**`, `README.md` (the orchestrator writes it). If one must change, stop and report the exact diff.

## Verified facts (on `main`, 2026-10-17)
- **`package.json` scripts already exist:**
  - `build` (= `tsc -b && vite build` → `dist/`);
  - `build:server` (= `vite build --ssr server/index.ts --outDir dist-server --emptyOutDir` → `dist-server/index.js`);
  - `serve` (= `node dist-server/index.js`);
  - `start` (= `node scripts/start.mjs`).
  - `engines.node` is `>=20`. `dist-server` is git-ignored.
- **The gate:** `npm run typecheck && npm run lint && npm test && npm run build:ui`.
- **The server (WP-45)** reads `PORT` (default 8080), `HOST` (default `127.0.0.1`) and `NWS_CONTACT`. It serves `../dist` relative to `dist-server/index.js`. It has `GET /healthz` → 200 `ok`. It has **no runtime npm dependencies**, so the runtime image needs only `dist/` + `dist-server/`.
- **Image name:** `ghcr.io/furbysoup/storm-chasers` (lowercase; the repo is `FurbySoup/storm-chasers`).
- Node 22 is the build version. Node 20 is the minimum for running.

## Build
- **`scripts/start.mjs`** (plain Node ESM, no deps):
  - if `dist/index.html` or `dist-server/index.js` is missing, or `--rebuild` is passed, run `npm run build` then `npm run build:server` (spawn with `stdio: 'inherit'`; `shell: true` on Windows), and exit non-zero if either fails;
  - then `import('../dist-server/index.js')`, using a file URL from `import.meta.url`, so env vars pass through.
  - Print one line first: `INFLOW: building (first run takes about a minute)…` when building.
- **`Dockerfile`**, multi-stage:
  - **build stage:** `node:22-alpine`, `npm ci`, `npm run build && npm run build:server`;
  - **runtime stage:**
    - `node:22-alpine`, `WORKDIR /app`, copy only `dist/` and `dist-server/`;
    - `ENV HOST=0.0.0.0 PORT=8080 NODE_ENV=production`. Inside a container it must listen on all interfaces; the README tells users to publish the port on `127.0.0.1`.
    - `EXPOSE 8080`, `USER node` (the non-root user the image ships with);
    - `HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1`;
    - `CMD ["node", "dist-server/index.js"]`.
  - OCI labels: `org.opencontainers.image.source=https://github.com/FurbySoup/storm-chasers`, `.description`, `.licenses=MIT`.
- **`.dockerignore`:**
  - `node_modules`, `dist`, `dist-server`;
  - `.git`, `.claude`, `.design-sync`, `ds-bundle`, `.ds-sync`;
  - `docs`, `*.log`.
- **`ci.yml`:**
  - triggers: `pull_request` and `push` to `main`; `permissions: contents: read`; `concurrency` cancels superseded runs.
  - steps: `actions/checkout@v4`, `actions/setup-node@v4` (node 22, npm cache), `npm ci`, the gate, `npm run build`, `npm run build:server`.
  - an **XSS guard** step that fails if `src/` contains `dangerouslySetInnerHTML` or `.innerHTML =`: `! grep -rnE "dangerouslySetInnerHTML|\.innerHTML\s*=" src`.
  - Use `shell: bash` with `set -o pipefail` where commands pipe.
- **`release.yml`:**
  - trigger: `push` tags `v*`; `permissions: contents: write, packages: write`.
  - Job 1, `verify`:
    - checkout and setup-node as in CI;
    - fail if the tag doesn't equal `v` + `package.json` version (`node -p "require('./package.json').version"`);
    - run the gate and both builds;
    - zip `dist/`, `dist-server/`, `LICENSE` and `README.md` into `inflow-${tag}.zip`, so `node dist-server/index.js` runs with no `npm ci`;
    - `gh release create "$TAG" inflow-$TAG.zip --generate-notes --verify-tag` (env `GH_TOKEN: ${{ github.token }}`).
  - Job 2, `image` (needs `verify`):
    - `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`;
    - `docker/login-action@v3` to `ghcr.io` with `github.actor` / `secrets.GITHUB_TOKEN`;
    - `docker/metadata-action@v5`, tags `type=semver,pattern={{version}}` and `type=raw,value=latest`;
    - `docker/build-push-action@v6`, `platforms: linux/amd64,linux/arm64` (Raspberry Pi wall displays), `push: true`, GHA cache.
- **Issue templates (issue forms):**
  - `source-broken.yml`: label `source-broken`. Fields: panel (dropdown: radar, alerts, streams, cameras, audio, SPC, satellite, other), state(s) or area, what the panel light shows, INFLOW version (from `? HELP` → ABOUT), how you run it (Docker / npm start).
  - `feature-idea.yml`: label `post-1.0`. It notes that ideas are collected for later releases.
  - `config.yml`: `blank_issues_enabled: false`, with a contact link "Questions" → `https://github.com/FurbySoup/storm-chasers/discussions`.
- **`SECURITY.md`** (short): report privately via GitHub's "Report a vulnerability" (Security tab), with a best-effort response; supported version = latest release; scope = the proxy server (open-proxy, traversal) and XSS.
- **`CONTRIBUTING.md`** (about 10 lines): run the gate; one source per PR; adapter + trimmed fixture + `normalize` test; never guess stream or channel IDs; proxy routes live in `proxy/routes.ts`; this is maintained best-effort.

## Acceptance
- [ ] Run `node scripts/start.mjs` once in your worktree. `server/index.ts` doesn't exist there yet (WP-45 lands separately), so it must run `npm run build`, then fail at `build:server` with a non-zero exit and a clear message, not hang. Report the last lines.
- [ ] Read each YAML file back and check indentation and `${{ }}` expressions by eye. The orchestrator runs `actionlint` after merge.
- [ ] If Docker is available (`docker version`), run `docker build -t inflow-test .` and report the result. A failure from the missing `server/` is expected here. Don't push anything.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
