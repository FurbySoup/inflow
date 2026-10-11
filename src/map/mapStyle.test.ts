import { beforeAll, describe, expect, it } from 'vitest'
import { CASING, FFW_CASING, FOCUS, HAZARD, LABEL, LABEL_HALO, MESOSCALE, OPACITY, PDS_MARK, REPORT, SPC_CATEGORY, FLY_EASING, cubicBezier, watchDash } from './mapStyle'

// Vitest blanks *.css imports (raw and inline alike), so read tokens.css from disk. 'node:fs' is loaded through a
// variable because @types/node is not installed; tests run in Node, so the import resolves at runtime.
const NODE_FS = 'node:fs'
interface FsLike {
  readFileSync(path: string, encoding: 'utf8'): string
}

const decls = new Map<string, string>()

beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ NODE_FS)) as FsLike
  // npm test runs from the repo root.
  const css = fs.readFileSync('src/ui/tokens.css', 'utf8')
  // Parse `--name: value;` declarations; token() resolves `var(--other)` references.
  for (const m of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) decls.set(m[1], m[2].trim())
})

function token(name: string): string {
  const raw = decls.get(name)
  if (raw === undefined) throw new Error(`token --${name} not found in tokens.css`)
  const ref = /^var\(--([\w-]+)\)$/.exec(raw)
  return ref ? token(ref[1]) : raw
}

const hex = (s: string) => s.toUpperCase()

describe('mapStyle constants match tokens.css', () => {
  it.each([
    ['HAZARD.TOR', HAZARD.TOR, 'p-nws-tor'],
    ['HAZARD.SVR', HAZARD.SVR, 'p-nws-svr'],
    ['HAZARD.FFW', HAZARD.FFW, 'p-nws-ffw'],
    ['HAZARD.TOA', HAZARD.TOA, 'p-nws-toa'],
    ['HAZARD.SVA', HAZARD.SVA, 'p-nws-sva'],
    ['HAZARD.SPS', HAZARD.SPS, 'p-nws-sps'],
    ['HAZARD.OTHER', HAZARD.OTHER, 'p-graphite-300'],
    ['SPC TSTM', SPC_CATEGORY.TSTM, 'p-spc-tstm'],
    ['SPC MRGL', SPC_CATEGORY.MRGL, 'p-spc-mrgl'],
    ['SPC SLGT', SPC_CATEGORY.SLGT, 'p-spc-slgt'],
    ['SPC ENH', SPC_CATEGORY.ENH, 'p-spc-enh'],
    ['SPC MDT', SPC_CATEGORY.MDT, 'p-spc-mdt'],
    ['SPC HIGH', SPC_CATEGORY.HIGH, 'p-spc-high'],
    ['REPORT.tornado', REPORT.tornado, 'p-report-tor'],
    ['REPORT.wind', REPORT.wind, 'p-report-wind'],
    ['REPORT.hail', REPORT.hail, 'p-report-hail'],
    ['MESOSCALE', MESOSCALE, 'p-graphite-200'],
    ['CASING', CASING, 'map-casing'],
    ['PDS_MARK', PDS_MARK, 'hz-pds-mark'],
    ['FOCUS', FOCUS, 'map-focus'],
    ['LABEL', LABEL, 'map-label'],
    ['LABEL_HALO', LABEL_HALO, 'map-label-halo'],
  ])('%s equals its token', (_name, value, token_) => {
    expect(hex(value)).toBe(hex(token(token_)))
  })

  it.each([
    ['OPACITY.spcFill', OPACITY.spcFill, 'map-spc-fill-opacity'],
    ['OPACITY.focusFill', OPACITY.focusFill, 'map-focus-fill-opacity'],
    ['OPACITY.dim', OPACITY.dim, 'map-dim-opacity'],
  ])('%s equals its token', (_name, value, token_) => {
    expect(value).toBe(Number(token(token_)))
  })

  it('FFW casing is graphite-50 at 60%', () => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(token('p-graphite-50').slice(1 + i, 3 + i), 16))
    expect(FFW_CASING).toBe(`rgba(${r},${g},${b},.6)`)
  })
})

describe('watchDash', () => {
  it('converts the 10 6 px dash into line-width multiples', () => {
    expect(watchDash(2)).toEqual([5, 3])
    expect(watchDash(4.5)[0]).toBeCloseTo(10 / 4.5)
  })
})

describe('cubicBezier', () => {
  it('starts at 0, ends at 1 and is monotonic for the fly-to curve', () => {
    expect(FLY_EASING(0)).toBe(0)
    expect(FLY_EASING(1)).toBe(1)
    let prev = 0
    for (let t = 0.05; t <= 1; t += 0.05) {
      const y = FLY_EASING(t)
      expect(y).toBeGreaterThanOrEqual(prev)
      prev = y
    }
  })

  it('is linear for the identity control points', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    expect(linear(0.3)).toBeCloseTo(0.3, 3)
  })
})
