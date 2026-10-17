// Resolves a pasted YouTube link, video link or @handle to a channel (WP-48). Keyless, through the same-origin
// /api/youtube proxy (ADR-0005). The channel is only ever confirmed from a channel page YouTube served, never
// from an ID in the input alone: the canonical link and the first externalId on that page must agree.

export type ParsedInput =
  | { kind: 'handle'; handle: string }
  | { kind: 'channel'; channelId: string }
  | { kind: 'path'; path: string }
  | { kind: 'video'; videoId: string }

export interface ResolvedChannel {
  channelId: string
  /** Channel name as YouTube shows it, entities decoded. */
  name: string
  /** `@handle` (with the @) when the channel page names one, else ''. */
  handle: string
}

export type ResolveFailure = 'unrecognised' | 'not-found' | 'unreachable'
export type ResolveResult = { ok: true; channel: ResolvedChannel } | { ok: false; reason: ResolveFailure }

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
// Includes the leading @, so a parsed handle is in the same form MyChaser.handle stores.
const HANDLE = /^@[A-Za-z0-9._-]{3,30}$/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
// Custom /c/ and /user/ names: not handles, so no 3-30 rule.
const CUSTOM_NAME = /^[A-Za-z0-9._-]{1,100}$/

/**
 * Accepts a bare UC id, an @handle, or a youtube.com / youtu.be link (with or without https://, www. or m.).
 * Any other host, or anything that does not match, is null.
 */
export function parseChannelInput(text: string): ParsedInput | null {
  const t = text.trim()
  if (t === '') return null
  if (HANDLE.test(t)) return { kind: 'handle', handle: t }
  if (CHANNEL_ID.test(t)) return { kind: 'channel', channelId: t }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
  const [first, second] = url.pathname.split('/').filter((p) => p !== '')

  if (host === 'youtu.be') {
    return first !== undefined && VIDEO_ID.test(first) ? { kind: 'video', videoId: first } : null
  }
  if (host !== 'youtube.com') return null

  if (first === 'watch') {
    const v = url.searchParams.get('v') ?? ''
    return VIDEO_ID.test(v) ? { kind: 'video', videoId: v } : null
  }
  if (first === 'live') {
    return second !== undefined && VIDEO_ID.test(second) ? { kind: 'video', videoId: second } : null
  }
  if (first?.startsWith('@')) {
    return HANDLE.test(first) ? { kind: 'handle', handle: first } : null
  }
  if (first === 'channel') {
    return second !== undefined && CHANNEL_ID.test(second) ? { kind: 'channel', channelId: second } : null
  }
  if ((first === 'c' || first === 'user') && second !== undefined && CUSTOM_NAME.test(second)) {
    return { kind: 'path', path: `/${first}/${second}` }
  }
  return null
}

const CANONICAL = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/
const EXTERNAL_ID = /"externalId":"(UC[A-Za-z0-9_-]{22})"/
const OG_TITLE = /<meta property="og:title" content="([^"]*)"/
const BASE_URL_HANDLE = /"canonicalBaseUrl":"\/(@[A-Za-z0-9._-]{3,30})"/
const OWNER_CHANNEL = /"channelId":"(UC[A-Za-z0-9_-]{22})"/

const NAMED_ENTITIES = new Map<string, string>([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
])

/** One pass, so `&amp;#39;` decodes to `&#39;` and not to an apostrophe. Unknown entities are left as written. */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#')) {
      const n = body.startsWith('#x') ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole
    }
    return NAMED_ENTITIES.get(body) ?? whole
  })
}

/**
 * Reads a channel page. The canonical /channel/UC… link and the first "externalId" must both exist and agree;
 * a consent page has neither, so it parses to null. `handle` is '' when the page names none.
 */
export function parseChannelPage(html: string): ResolvedChannel | null {
  const canonical = CANONICAL.exec(html)?.[1]
  const external = EXTERNAL_ID.exec(html)?.[1]
  if (canonical === undefined || external === undefined || canonical !== external) return null
  const title = OG_TITLE.exec(html)?.[1]
  if (title === undefined) return null
  const name = decodeEntities(title).trim()
  if (name === '') return null
  return { channelId: canonical, name, handle: BASE_URL_HANDLE.exec(html)?.[1] ?? '' }
}

/** The channel that owns a watch page: the first "channelId" in its video details, or null. */
export function parseWatchOwner(html: string): string | null {
  const at = html.indexOf('"videoDetails"')
  if (at < 0) return null
  return OWNER_CHANNEL.exec(html.slice(at))?.[1] ?? null
}

const BASE = '/api/youtube'

type Page = { ok: true; html: string } | { ok: false; reason: 'not-found' | 'unreachable' }

/** 404 is not-found; any other failure is unreachable. Aborts propagate, as in liveness.ts. */
async function getPage(path: string, signal?: AbortSignal): Promise<Page> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal })
    if (res.status === 404) return { ok: false, reason: 'not-found' }
    if (!res.ok) return { ok: false, reason: 'unreachable' }
    return { ok: true, html: await res.text() }
  } catch (err) {
    if (signal?.aborted) throw err
    return { ok: false, reason: 'unreachable' }
  }
}

/** Resolves user input to a verified channel: a watch link goes to the owner's channel page first. */
export async function resolveChannel(text: string, signal?: AbortSignal): Promise<ResolveResult> {
  const input = parseChannelInput(text)
  if (input === null) return { ok: false, reason: 'unrecognised' }

  let path: string
  if (input.kind === 'video') {
    const watch = await getPage(`/watch?v=${input.videoId}`, signal)
    if (!watch.ok) return { ok: false, reason: watch.reason }
    const owner = parseWatchOwner(watch.html)
    if (owner === null) return { ok: false, reason: 'unreachable' }
    path = `/channel/${owner}`
  } else if (input.kind === 'handle') {
    path = `/${input.handle}`
  } else if (input.kind === 'channel') {
    path = `/channel/${input.channelId}`
  } else {
    path = input.path
  }

  const page = await getPage(path, signal)
  if (!page.ok) return { ok: false, reason: page.reason }
  const channel = parseChannelPage(page.html)
  if (channel === null) return { ok: false, reason: 'unreachable' }
  return { ok: true, channel }
}
