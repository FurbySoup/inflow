import { describe, expect, it } from 'vitest'
import { REPO_URL, matchRoute, nwsUserAgent, proxyRoutes } from './routes'

describe('proxy route table', () => {
  const routes = proxyRoutes()

  it('has one route per prefix, each a bare https/http origin', () => {
    const prefixes = routes.map((r) => r.prefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    for (const r of routes) {
      expect(r.prefix).toMatch(/^\/api\/[a-z0-9]+$/)
      expect(new URL(r.target).origin).toBe(r.target)
    }
  })

  it('allows POST only on the CARS GraphQL routes', () => {
    const post = routes.filter((r) => r.methods.includes('POST')).map((r) => r.prefix)
    expect(post.sort()).toEqual(['/api/511ia', '/api/511in', '/api/511mn', '/api/kandrive', '/api/ne511'])
  })

  it('matches whole path segments only', () => {
    expect(matchRoute(routes, '/api/nws/alerts/active')?.prefix).toBe('/api/nws')
    expect(matchRoute(routes, '/api/nws')?.prefix).toBe('/api/nws')
    expect(matchRoute(routes, '/api/nwsx/alerts')).toBeNull()
    expect(matchRoute(routes, '/api/unknown/x')).toBeNull()
  })

  it('sends the NWS User-Agent: repo + a per-start id by default, or NWS_CONTACT', () => {
    const nws = (env = {}) => matchRoute(proxyRoutes(env), '/api/nws')?.headers?.['User-Agent']
    expect(nws()).toBe(nwsUserAgent())
    expect(nwsUserAgent(undefined, 'abc12345')).toBe('INFLOW (github.com/FurbySoup/inflow; abc12345)')
    expect(nwsUserAgent()).toMatch(/^INFLOW \(github\.com\/FurbySoup\/inflow; [0-9a-f]{8}\)$/)
    expect(REPO_URL).toBe('https://github.com/FurbySoup/inflow')
    expect(nws({ NWS_CONTACT: 'me@example.com' })).toBe('INFLOW (me@example.com)')
    expect(nws({ NWS_CONTACT: '  ' })).toBe(nwsUserAgent())
  })

  it('sends only the fixed consent-reject cookie to YouTube, and no cookie anywhere else', () => {
    for (const r of routes) {
      const cookie = r.headers?.Cookie
      expect(cookie).toBe(r.prefix === '/api/youtube' ? 'SOCS=CAI' : undefined)
    }
  })
})
