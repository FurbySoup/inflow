// Production entry (WP-45, ADR-0020): serves dist/ and the /api/* proxy. Env: PORT (8080), HOST (127.0.0.1),
// NWS_CONTACT (User-Agent contact). Bundled to dist-server/index.js by `npm run build:server`.
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { proxyRoutes } from '../proxy/routes'
import { createApp } from './app'

const port = Number(process.env.PORT ?? '8080')
const host = process.env.HOST ?? '127.0.0.1'
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`INFLOW: PORT must be 0-65535, got "${process.env.PORT}"`)
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

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`INFLOW: could not listen on ${host}:${port} (${err.code ?? err.message})`)
  process.exit(1)
})

server.listen(port, host, () => {
  const address = server.address()
  const bound = typeof address === 'object' && address !== null ? address.port : port
  const lan = host === '0.0.0.0' ? ' (LAN: reachable from other devices)' : ''
  console.log(`INFLOW listening on http://${host}:${bound}${lan}`)
})
