import type { Bbox } from '../../types'
import type { SourceAdapter } from '../types'
import { nwsPoint } from './points'

// Same proxy as alerts.ts and points.ts: /api/nws adds the NWS User-Agent.
const BASE = '/api/nws'

/** The newest HWO for one office, as `/products/types/HWO/locations/{CWA}/latest` returns it. */
export interface NwsHwoProduct {
  id: string
  issuingOffice: string
  issuanceTime: string
  /** Plain text with `\n` line breaks: WMO header, county list, then dot-headed sections ending at `$$`. */
  productText: string
}

/** Null when the AOI centre has no NWS point (offshore). `product` is null when the office has no HWO in the API. */
export interface NwsHwoRaw {
  cwa: string
  product: NwsHwoProduct | null
}

export interface Hwo {
  cwa: string
  /** Epoch ms of issuance. */
  issued: number
  /** Paragraphs separated by a blank line. */
  dayOne: string
  daysTwoToSeven: string
  /** True when activation is requested or expected; false when the text says it is not expected, needed or requested; null when no spotter sentence exists. */
  spotterActivation: boolean | null
  url: string
}

export interface HwoSections {
  dayOne: string
  daysTwoToSeven: string
  spotter: string
}

// The /latest product is the full text, so one call answers both "what is newest" and "what does it say".
// Reused per office for this long: a pan inside the same office makes no new product request.
const CACHE_MS = 25 * 60_000
const cache = new Map<string, { at: number; product: NwsHwoProduct | null }>()

/** Test helper: forget cached products. */
export function resetHwoCache(): void {
  cache.clear()
}

/** Blank lines separate paragraphs; single line breaks inside a paragraph become spaces. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0)
}

// A section header is a line like `.DAY ONE...This Afternoon and Tonight...`. Sub-headings such as `RISK...` have no leading dot.
const SECTION_HEADER = /^\.([A-Z][A-Z ]*)\.\.\.[^\n]*$/gm

/** Splits the product text into its Day One, Days Two to Seven and spotter text. Missing sections are ''. */
export function parseHwo(text: string): HwoSections {
  const body = text.split(/^\$\$/m)[0] ?? ''
  const headers = [...body.matchAll(SECTION_HEADER)]
  const sections = headers.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length
    const end = headers[i + 1]?.index ?? body.length
    return { name: m[1], text: body.slice(start, end) }
  })
  const section = (prefix: string) => sections.find((s) => s.name.startsWith(prefix))?.text ?? ''

  const spotterSection = section('SPOTTER')
  // Some offices (TSA) put the spotter line inside Day One instead of its own section.
  const spotter = spotterSection
    ? paragraphs(spotterSection).join('\n\n')
    : (paragraphs(body).find((p) => /spotter activation/i.test(p)) ?? '')

  return {
    dayOne: paragraphs(section('DAY ONE')).join('\n\n'),
    daysTwoToSeven: paragraphs(section('DAYS TWO')).join('\n\n'),
    spotter,
  }
}

const NOT_ACTIVATED = /\bnot (?:be )?(?:expected|needed|requested)\b/i

/**
 * "Spotter activation will not be needed" and "Spotter Activation Not Expected" are both false.
 * Null when there is no spotter activation sentence: the caller shows nothing rather than guess.
 */
export function isSpotterActivation(spotter: string): boolean | null {
  if (!/spotter activation/i.test(spotter)) return null
  return !NOT_ACTIVATED.test(spotter)
}

export function fullTextUrl(cwa: string): string {
  return `https://forecast.weather.gov/product.php?site=${cwa}&issuedby=${cwa}&product=HWO&format=txt`
}

function parseProduct(body: unknown): NwsHwoProduct | null {
  if (typeof body !== 'object' || body === null) return null
  const p = body as Partial<Record<keyof NwsHwoProduct, unknown>>
  if (
    typeof p.id !== 'string' ||
    typeof p.issuingOffice !== 'string' ||
    typeof p.issuanceTime !== 'string' ||
    typeof p.productText !== 'string'
  ) {
    return null
  }
  return { id: p.id, issuingOffice: p.issuingOffice, issuanceTime: p.issuanceTime, productText: p.productText }
}

async function latestProduct(cwa: string, signal?: AbortSignal): Promise<NwsHwoProduct | null> {
  const hit = cache.get(cwa)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.product

  const res = await fetch(`${BASE}/products/types/HWO/locations/${cwa}/latest`, {
    signal,
    headers: { Accept: 'application/ld+json' },
  })
  // 404 and 500 mean "no HWO in the API" (CAE, GSP, CHS, OUN, BMX, TAE on 2026-10-11), not a feed error.
  if (res.status === 404 || res.status === 500) {
    cache.set(cwa, { at: Date.now(), product: null })
    return null
  }
  if (!res.ok) throw new Error(`NWS HWO ${res.status}`)
  const product = parseProduct(await res.json())
  cache.set(cwa, { at: Date.now(), product })
  return product
}

export const nwsHwo: SourceAdapter<NwsHwoRaw | null, Hwo> = {
  id: 'nws-hwo',
  refreshMs: 30 * 60_000,
  async fetch(aoi: Bbox, signal) {
    const point = nwsPoint.normalize(await nwsPoint.fetch(aoi, signal))[0]
    if (!point) return null
    return { cwa: point.cwa, product: await latestProduct(point.cwa, signal) }
  },
  normalize(raw) {
    if (!raw?.product) return []
    const issued = Date.parse(raw.product.issuanceTime)
    if (!Number.isFinite(issued)) return []
    const { dayOne, daysTwoToSeven, spotter } = parseHwo(raw.product.productText)
    if (!dayOne && !daysTwoToSeven) return []
    return [
      {
        cwa: raw.cwa,
        issued,
        dayOne,
        daysTwoToSeven,
        spotterActivation: isSpotterActivation(spotter),
        url: fullTextUrl(raw.cwa),
      },
    ]
  },
}
