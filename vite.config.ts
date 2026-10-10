/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: upstreams that need headers browsers can't set, or that block CORS.
// When hosted, each entry becomes a route in the edge proxy (see docs/adr/0005).
const USER_AGENT = 'storm-chasers (github.com/FurbySoup/storm-chasers)'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nws': {
        target: 'https://api.weather.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nws/, ''),
        headers: { 'User-Agent': USER_AGENT },
      },
      // CARS GraphQL (KS/NE DOT cameras): POST preflight is rejected cross-origin.
      '/api/kandrive': {
        target: 'https://www.kandrive.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/kandrive/, '/api'),
      },
      '/api/ne511': {
        target: 'https://511.nebraska.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ne511/, '/api'),
      },
      // TxDOT ITS (TX cameras): no CORS on its JSON endpoints.
      '/api/txdot': {
        target: 'https://its.txdot.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/txdot/, ''),
      },
      '/api/kiwisdr': {
        target: 'http://rx.linkfanel.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/kiwisdr/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
