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

  it('sends the NWS User-Agent with the repo URL unless NWS_CONTACT is set', () => {
    const nws = (env = {}) => matchRoute(proxyRoutes(env), '/api/nws')?.headers?.['User-Agent']
    expect(nws()).toBe(nwsUserAgent())
    expect(nwsUserAgent()).toContain(REPO_URL)
    expect(nws({ NWS_CONTACT: 'me@example.com' })).toBe('INFLOW storm-chasers (me@example.com)')
    expect(nws({ NWS_CONTACT: '  ' })).toContain(REPO_URL)
  })
})
