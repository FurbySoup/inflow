/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import { proxyRoutes } from './proxy/routes'
import pkg from './package.json' with { type: 'json' }

// Dev proxy: built from the shared route table in proxy/routes.ts (ADR-0005, ADR-0020), which the
// production server in server/ also reads. Add routes there, not here.
function devProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const out: Record<string, ProxyOptions> = {}
  for (const r of proxyRoutes({ NWS_CONTACT: env.NWS_CONTACT })) {
    out[r.prefix] = {
      target: r.target,
      changeOrigin: true,
      rewrite: (p) => r.upstreamPath + p.slice(r.prefix.length),
      ...(r.headers ? { headers: { ...r.headers } } : {}),
    }
  }
  return out
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Shown in ? HELP > ABOUT, so bug reports can name the release.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    // Listen on all interfaces so other devices on the LAN can open the dev server (proxy routes work for them too).
    host: true,
    proxy: devProxy(loadEnv(mode, process.cwd(), '')),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'proxy/**/*.test.ts', 'server/**/*.test.ts'],
  },
}))
