// Production entry (WP-45, ADR-0020): serves dist/ and the /api/* proxy. Env: PORT (8080), HOST (127.0.0.1),
// NWS_CONTACT (User-Agent contact), OPEN_BROWSER=1 (same as --open). Bundled to dist-server/index.js by `npm run build:server`.
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { proxyRoutes } from '../proxy/routes'
import { createApp } from './app'
import { listenWithFallback } from './listen'
import { browserUrl, openBrowser, wantsBrowser } from './openBrowser'

const rawPort = process.env.PORT?.trim()
const explicitPort = rawPort !== undefined && rawPort !== ''
const port = explicitPort ? Number(rawPort) : 8080
const host = process.env.HOST || '127.0.0.1'
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`INFLOW: PORT must be 0-65535, got "${rawPort}"`)
  process.exit(1)
}

// dist-server/index.js and dist/ are siblings, so this resolves to the built app in both layouts.
const distDir = fileURLToPath(new URL('../dist', import.meta.url))
if (!existsSync(path.join(distDir, 'index.html'))) {
  console.warn('INFLOW: dist/index.html is missing. Run "npm run build" first; /api/* still works.')
}

const app = createApp({
  routes: proxyRoutes({ NWS_CONTACT: process.env.NWS_CONTACT }),
  distDir,
})

const server = createServer((req, res) => {
  void app(req, res)
})

async function main(): Promise<void> {
  const bound = await listenWithFallback(server, { port, host, explicitPort })
  const lan = host === '0.0.0.0' ? ' (LAN: reachable from other devices)' : ''
  console.log(`INFLOW listening on http://${host}:${bound}${lan}`)
  console.log(`INFLOW is running: http://localhost:${bound}`)
  console.log('Leave this window open while you use it. Close it (or press Ctrl+C) to stop INFLOW.')
  if (wantsBrowser(process.argv, process.env)) openBrowser(browserUrl(host, bound))
}

main().catch(() => {
  // listenWithFallback has already printed the reason and exited; this only covers an injected exit.
  process.exitCode = 1
})
