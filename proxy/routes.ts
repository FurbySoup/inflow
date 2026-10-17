// The one `/api/*` proxy table (ADR-0005, ADR-0020). The Vite dev server and the production server
// (`server/`) both read it, so a route added here works in both. Adapters use the `/api/<source>` path,
// never the upstream host.
//
// Rules the production server enforces from this table:
// - the upstream host is fixed per prefix; nothing in the request can change it (not an open proxy);
// - only the listed methods are allowed;
// - only the listed headers are sent upstream (cookies are never forwarded).

export type ProxyMethod = 'GET' | 'POST'

export interface ProxyRoute {
  /** Same-origin path prefix, e.g. `/api/nws`. */
  prefix: string
  /** Upstream origin (scheme + host), with no path. */
  target: string
  /** Path that replaces `prefix` upstream: `/api/kandrive/x` → `${target}${upstreamPath}/x`. */
  upstreamPath: string
  methods: readonly ProxyMethod[]
  /** Extra headers sent upstream (e.g. the NWS User-Agent). */
  headers?: Readonly<Record<string, string>>
  /** How long the production server may reuse a GET response, in seconds. Kept at or below the adapters' polling. */
  cacheSeconds: number
}

export const REPO_URL = 'https://github.com/FurbySoup/storm-chasers'

/** NWS asks for an identifying User-Agent with a contact (URL or email). `NWS_CONTACT` overrides the repo URL. */
export function nwsUserAgent(contact?: string): string {
  const c = contact?.trim() || REPO_URL
  return `INFLOW storm-chasers (${c})`
}

// A phone User-Agent makes YouTube 302 /watch to m.youtube.com, which the browser then fetches cross-origin
// and CORS blocks (seen 2026-10-11 from a mobile-emulated client). Always ask as desktop.
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

const GET: readonly ProxyMethod[] = ['GET']
// CARS GraphQL: the camera query is a JSON POST.
const CARS: readonly ProxyMethod[] = ['GET', 'POST']

export interface RouteEnv {
  NWS_CONTACT?: string
}

export function proxyRoutes(env: RouteEnv = {}): ProxyRoute[] {
  return [
    {
      prefix: '/api/nws',
      target: 'https://api.weather.gov',
      upstreamPath: '',
      methods: GET,
      headers: { 'User-Agent': nwsUserAgent(env.NWS_CONTACT) },
      cacheSeconds: 30,
    },
    // CARS GraphQL (KS/NE DOT cameras): POST preflight is rejected cross-origin.
    { prefix: '/api/kandrive', target: 'https://www.kandrive.gov', upstreamPath: '/api', methods: CARS, cacheSeconds: 60 },
    { prefix: '/api/ne511', target: 'https://511.nebraska.gov', upstreamPath: '/api', methods: CARS, cacheSeconds: 60 },
    // TxDOT ITS (TX cameras): no CORS on its JSON endpoints.
    { prefix: '/api/txdot', target: 'https://its.txdot.gov', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    // 511SC (SC cameras): Iteris GeoJSON list, no CORS.
    { prefix: '/api/511sc', target: 'https://sc.cdn.iteris-atis.com', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    // IBI "511" sites (GA, FL): the keyless camera list has no CORS.
    { prefix: '/api/511ga', target: 'https://511ga.org', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/fl511', target: 'https://fl511.com', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    // Wave 8 (WP-28): CARS GraphQL for IA, MN, IN. The POST answers with ACAO *, but the OPTIONS preflight
    // hits the CloudFront SPA shell with no ACAO (re-checked 2026-10-11), so they are proxied like KS/NE.
    { prefix: '/api/511ia', target: 'https://511ia.org', upstreamPath: '/api', methods: CARS, cacheSeconds: 60 },
    { prefix: '/api/511mn', target: 'https://511mn.org', upstreamPath: '/api', methods: CARS, cacheSeconds: 60 },
    { prefix: '/api/511in', target: 'https://511in.org', upstreamPath: '/api', methods: CARS, cacheSeconds: 60 },
    // Wave 8 (WP-29): more IBI "511" sites. None send CORS on the camera list (re-checked 2026-10-11).
    { prefix: '/api/az511', target: 'https://az511.gov', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/511id', target: 'https://511.idaho.gov', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/511ak', target: 'https://511.alaska.gov', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/511la', target: 'https://511la.org', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/ctroads', target: 'https://ctroads.org', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/nvroads', target: 'https://www.nvroads.com', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/511pa', target: 'https://www.511pa.com', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    { prefix: '/api/newengland511', target: 'https://newengland511.org', upstreamPath: '', methods: GET, cacheSeconds: 60 },
    // KiwiSDR receiver directory (plain HTTP upstream; receivers themselves are link-out only).
    { prefix: '/api/kiwisdr', target: 'http://rx.linkfanel.net', upstreamPath: '', methods: GET, cacheSeconds: 600 },
    // YouTube watch and channel pages for stream liveness (ADR-0013). No CORS; best-effort.
    {
      prefix: '/api/youtube',
      target: 'https://www.youtube.com',
      upstreamPath: '',
      methods: GET,
      headers: { 'User-Agent': DESKTOP_UA },
      cacheSeconds: 60,
    },
  ]
}

/** The route whose prefix owns `path` (exact prefix or prefix + `/`), or null. */
export function matchRoute(routes: readonly ProxyRoute[], path: string): ProxyRoute | null {
  return routes.find((r) => path === r.prefix || path.startsWith(r.prefix + '/')) ?? null
}
