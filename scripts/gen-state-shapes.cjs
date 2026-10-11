// Regenerates src/lib/stateShapes.json (ADR-0016). Source: us-atlas@3.0.1 states-10m.json (ISC licence, US Census
// cartographic boundaries). Download it first, then run from the repo root:
//   curl -o states-10m.json https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json
//   node scripts/gen-state-shapes.cjs states-10m.json src/lib/stateShapes.json
const fs = require('fs')
const [, , inPath, outPath] = process.argv
const topo = JSON.parse(fs.readFileSync(inPath, 'utf8'))

const FIPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
  '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
}

const { scale, translate } = topo.transform
const arcs = topo.arcs.map((arc) => {
  let x = 0
  let y = 0
  return arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
  })
})

function arcPoints(i) {
  return i >= 0 ? arcs[i] : [...arcs[~i]].reverse()
}

function ring(indices) {
  const out = []
  indices.forEach((i, k) => {
    const pts = arcPoints(i)
    out.push(...(k === 0 ? pts : pts.slice(1)))
  })
  return out
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts
  let maxD = 0
  let idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]]
  const left = simplify(pts.slice(0, idx + 1), tol)
  const right = simplify(pts.slice(idx), tol)
  return [...left.slice(0, -1), ...right]
}

function area(r) {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1])
  return Math.abs(a / 2)
}

const TOL = 0.05 // degrees, about 5 km
const MIN_AREA = 0.002 // square degrees; drops specks, keeps the keys and barrier islands that matter
const round = (n) => Math.round(n * 1000) / 1000

const out = {}
for (const g of topo.objects.states.geometries) {
  const code = FIPS[g.id]
  if (!code) continue
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs
  const rings = []
  for (const poly of polys) {
    const outer = ring(poly[0])
    if (area(outer) < MIN_AREA) continue
    // Simplify as an open line from the first vertex, then close it again.
    let s = simplify(outer, TOL)
    if (s.length < 4) s = outer.length <= 8 ? outer : simplify(outer, TOL / 4)
    if (s.length < 4) continue
    const r = s.map(([x, y]) => [round(x), round(y)])
    const [fx, fy] = r[0]
    const [lx, ly] = r[r.length - 1]
    if (fx !== lx || fy !== ly) r.push([fx, fy])
    rings.push(r)
  }
  out[code] = rings
}

const codes = Object.keys(out).sort()
const sorted = Object.fromEntries(codes.map((c) => [c, out[c]]))
fs.writeFileSync(outPath, JSON.stringify(sorted) + '\n')
const verts = codes.reduce((n, c) => n + out[c].reduce((m, r) => m + r.length, 0), 0)
console.log(`${codes.length} codes, ${verts} vertices, ${fs.statSync(outPath).size} bytes`)
console.log(codes.filter((c) => out[c].length === 0))
