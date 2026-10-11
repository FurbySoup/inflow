/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: upstreams that need headers browsers can't set, or that block CORS.
// When hosted, each entry becomes a route in the edge proxy (see docs/adr/0005).
const USER_AGENT = 'storm-chasers (github.com/FurbySoup/storm-chasers)'

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so other devices on the LAN can open the dev server (proxy routes work for them too).
    host: true,
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
      // 511SC (SC cameras): Iteris GeoJSON list, no CORS.
      '/api/511sc': {
        target: 'https://sc.cdn.iteris-atis.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511sc/, ''),
      },
      // IBI "511" sites (GA, FL): the keyless camera list has no CORS.
      '/api/511ga': {
        target: 'https://511ga.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511ga/, ''),
      },
      '/api/fl511': {
        target: 'https://fl511.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/fl511/, ''),
      },
      // Wave 8 (WP-28): CARS GraphQL for IA, MN, IN. The POST answers with ACAO *, but the OPTIONS preflight
      // hits the CloudFront SPA shell with no ACAO (re-checked 2026-10-11), so they are proxied like KS/NE.
      '/api/511ia': {
        target: 'https://511ia.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511ia/, '/api'),
      },
      '/api/511mn': {
        target: 'https://511mn.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511mn/, '/api'),
      },
      '/api/511in': {
        target: 'https://511in.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511in/, '/api'),
      },
      // Wave 8 (WP-29): more IBI "511" sites. None send CORS on the camera list (re-checked 2026-10-11).
      '/api/az511': {
        target: 'https://az511.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/az511/, ''),
      },
      '/api/511id': {
        target: 'https://511.idaho.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511id/, ''),
      },
      '/api/511ak': {
        target: 'https://511.alaska.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511ak/, ''),
      },
      '/api/511la': {
        target: 'https://511la.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511la/, ''),
      },
      '/api/ctroads': {
        target: 'https://ctroads.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ctroads/, ''),
      },
      '/api/nvroads': {
        target: 'https://www.nvroads.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nvroads/, ''),
      },
      '/api/511pa': {
        target: 'https://www.511pa.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/511pa/, ''),
      },
      '/api/newengland511': {
        target: 'https://newengland511.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/newengland511/, ''),
      },
      '/api/kiwisdr': {
        target: 'http://rx.linkfanel.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/kiwisdr/, ''),
      },
      // YouTube watch and channel-embed pages for stream liveness (ADR-0013). No CORS; local only.
      // A phone User-Agent makes YouTube 302 /watch to m.youtube.com, which the browser then fetches cross-origin
      // and CORS blocks (seen 2026-10-11 from a mobile-emulated client). Always ask as desktop.
      '/api/youtube': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/youtube/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
