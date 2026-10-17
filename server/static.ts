// Serves the built app from `dist/` (WP-45). GET and HEAD only. Paths are resolved under `distDir` and anything
// that lands outside it is answered with 404. Hashed `assets/*` are immutable; `index.html` is revalidated.
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { CachedResponse } from './cache'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

export function contentTypeFor(file: string): string {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

export function cacheControlFor(urlPath: string): string {
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable'
  return 'no-cache'
}

/** Resolves a decoded request path under `root`, or null if it escapes `root`. */
export function resolveUnderRoot(root: string, decodedPath: string): string | null {
  const full = path.resolve(root, '.' + decodedPath)
  const rel = path.relative(root, full)
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) return null
  return full
}

/** Looks up `urlPath` (already the URL pathname, still percent-encoded) in `distDir`. Returns null for a 404. */
export async function readStaticFile(distDir: string, urlPath: string): Promise<CachedResponse | null> {
  const root = path.resolve(distDir)
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null

  const target = decoded === '/' ? '/index.html' : decoded
  const full = resolveUnderRoot(root, target)
  if (full === null) return null

  try {
    const info = await stat(full)
    if (!info.isFile()) return null
    const body = await readFile(full)
    return {
      status: 200,
      headers: {
        'content-type': contentTypeFor(full),
        'cache-control': cacheControlFor(target),
        'content-length': String(body.byteLength),
      },
      body,
    }
  } catch {
    return null
  }
}
