/**
 * Shared MapLibre paint constants (INFLOW v1 §2 and §7). MapLibre paint can't read CSS variables, so
 * these are literal hex values. Each one must equal the token it names in `src/ui/tokens.css`;
 * `mapStyle.test.ts` fails if they drift.
 */

/** NWS hazard colours by hazardCode (`src/lib/hazards.ts`). OTHER is the neutral warning colour. */
export const HAZARD = {
  TOR: '#FF0000', // --p-nws-tor
  SVR: '#FFA500', // --p-nws-svr
  FFW: '#8B0000', // --p-nws-ffw
  TOA: '#FFFF00', // --p-nws-toa
  SVA: '#DB7093', // --p-nws-sva
  OTHER: '#8E9AA5', // --p-graphite-300
} as const

/** SPC categorical outlook fills, keyed by the outlook LABEL. */
export const SPC_CATEGORY = {
  TSTM: '#C1E9C1', // --p-spc-tstm
  MRGL: '#66A366', // --p-spc-mrgl
  SLGT: '#FFE066', // --p-spc-slgt
  ENH: '#FFA366', // --p-spc-enh
  MDT: '#E06666', // --p-spc-mdt
  HIGH: '#EE99EE', // --p-spc-high
} as const

/** Storm report markers: tornado ▼, wind ■, hail ●. */
export const REPORT = {
  tornado: '#FF4040', // --p-report-tor
  wind: '#3D7DFF', // --p-report-wind
  hail: '#2DB84A', // --p-report-hail
} as const

/** Mesoscale discussion outline: neutral graphite, so it never reads as a hazard. */
export const MESOSCALE = '#B8C1C9' // --p-graphite-200

/** Dark casing under every stroke; also the report marker outline. */
export const CASING = '#040608' // --map-casing (graphite-1000)

/** FFW is the one hazard too dark for the dark basemap: it gets a light casing instead. */
export const FFW_CASING = 'rgba(242,245,247,.6)' // graphite-50 at 60%

/** PDS middle stroke. */
export const PDS_MARK = '#F2F5F7' // --hz-pds-mark (graphite-50)

/** Focus accent: a halo or bracket only, never a fill. */
export const FOCUS = '#CFE6F8' // --map-focus (ice-200)

/** Overlay labels and basemap labels. */
export const LABEL = '#C3CDD6' // --map-label
export const LABEL_HALO = '#040608' // --map-label-halo (graphite-1000)

export const OPACITY = {
  /** SPC categorical fill. */
  spcFill: 0.16, // --map-spc-fill-opacity
  /** Focused warning's hazard fill. */
  focusFill: 0.14, // --map-focus-fill-opacity
  /** Non-focused warnings while something is focused. */
  dim: 0.55, // --map-dim-opacity
  /** Ice halo drawn around the focused warning. */
  focusHalo: 0.35,
} as const

/** Watch outline dash pattern in CSS px (SVG `10 6`). MapLibre scales dasharray by line width, so convert. */
export const WATCH_DASH_PX = [10, 6] as const

/** MapLibre `line-dasharray` for a line of `widthPx` that should dash like WATCH_DASH_PX. */
export function watchDash(widthPx: number): number[] {
  return WATCH_DASH_PX.map((px) => px / widthPx)
}

/** cubic-bezier(.45,0,.2,1): the fly-to easing from INFLOW §8. Input and output are in 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bezier = (p1: number, p2: number, s: number) => 3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s * s * (1 - s) + s ** 3
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    // Solve x(s) = t by bisection (x is monotonic for these control points), then read y(s).
    let lo = 0
    let hi = 1
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (bezier(x1, x2, mid) < t) lo = mid
      else hi = mid
    }
    return bezier(y1, y2, (lo + hi) / 2)
  }
}

export const FLY_EASING = cubicBezier(0.45, 0, 0.2, 1)
export const FLY_MS = 900
