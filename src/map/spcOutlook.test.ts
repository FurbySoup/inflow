import type maplibregl from 'maplibre-gl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emptyDayJson from '../sources/spc/fixtures/outlook-d4-empty.geojson?raw'
import outlookJson from '../sources/spc/fixtures/outlook.geojson?raw'
import { OPACITY } from './mapStyle'
import { getOutlookLoaded, getOutlookLoading, setOutlookDay, setOutlookLoaded, setOutlookLoading } from './outlookDay'
import { spcOutlookLayer } from './spcOutlook'

// A map stand-in whose stack is a plain id list: moveLayer really reorders it, so the tests read the draw order.
interface FakeMap {
  map: maplibregl.Map
  ids: string[]
  paint: Array<[string, string, unknown]>
  setData: ReturnType<typeof vi.fn>
  remove: () => void
}

function fakeMap(initial: string[]): FakeMap {
  const ids = [...initial]
  const paint: Array<[string, string, unknown]> = []
  const handlers = new Map<string, () => void>()
  const setData = vi.fn()
  const source = { setData }
  const map = {
    getSource: () => source,
    addSource: () => undefined,
    addLayer: (layer: { id: string }) => {
      ids.push(layer.id)
    },
    getStyle: () => ({ layers: ids.map((id) => ({ id })) }),
    moveLayer: (id: string, before?: string) => {
      ids.splice(ids.indexOf(id), 1)
      ids.splice(before === undefined ? ids.length : ids.indexOf(before), 0, id)
    },
    setPaintProperty: (id: string, prop: string, value: unknown) => {
      paint.push([id, prop, value])
    },
    on: (event: string, fn: () => void) => {
      handlers.set(event, fn)
    },
  }
  return {
    map: map as unknown as maplibregl.Map,
    ids,
    paint,
    setData,
    remove: () => handlers.get('remove')?.(),
  }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// Day 3 fails so the failure path can be tested; Day 4 is the empty placeholder.
function respondFor(url: string) {
  if (url.includes('day3')) return { ok: false, status: 500, json: async () => ({}) }
  const body = url.includes('day4') ? emptyDayJson : outlookJson
  return { ok: true, status: 200, json: async () => JSON.parse(body) as unknown }
}

let open: FakeMap[] = []

function setup(): FakeMap {
  const f = fakeMap(['satellite'])
  open.push(f)
  spcOutlookLayer.add(f.map)
  // Radar and velocity are added after the outlook, as MapPanel adds them in layer order.
  f.ids.push('radar-m00', 'velocity', 'watch-outlines')
  return f
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => respondFor(url)),
  )
  setOutlookDay(1)
  setOutlookLoading(null)
  setOutlookLoaded({ day: 1, window: null, highest: null, emptyLabel: null })
})

afterEach(() => {
  for (const f of open) f.remove()
  open = []
  vi.unstubAllGlobals()
})

const ORDER_D1 = ['satellite', 'spc-outlook', 'spc-outlook-line', 'radar-m00', 'velocity', 'watch-outlines']
const ORDER_D2 = ['satellite', 'radar-m00', 'velocity', 'spc-outlook', 'spc-outlook-line', 'watch-outlines']

describe('spcOutlookLayer day emphasis', () => {
  it('lifts D2 above radar and velocity at the dim opacity, and restores D1 under radar', async () => {
    const f = setup()
    await flush()
    expect(f.ids).toEqual(ORDER_D1)

    setOutlookDay(2)
    // The press repaints and moves at once, before the data arrives.
    expect(f.ids).toEqual(ORDER_D2)
    expect(f.paint).toContainEqual(['spc-outlook', 'fill-opacity', OPACITY.dim])
    expect(f.paint).toContainEqual(['spc-outlook-line', 'line-width', 2])
    await flush()
    expect(getOutlookLoaded()?.day).toBe(2)

    setOutlookDay(1)
    expect(f.ids).toEqual(ORDER_D1)
    expect(f.paint).toContainEqual(['spc-outlook', 'fill-opacity', OPACITY.spcFill])
    expect(f.paint).toContainEqual(['spc-outlook-line', 'line-width', 1])
  })

  it('shows LOADING on a day change, and clears it when that day fails, keeping the last good outlook', async () => {
    setup()
    await flush()
    expect(getOutlookLoaded()?.day).toBe(1)
    setOutlookDay(3)
    expect(getOutlookLoading()).toBe(3)
    await flush()
    expect(getOutlookLoading()).toBeNull()
    expect(getOutlookLoaded()?.day).toBe(1)
  })

  it('reports the empty Day 4 placeholder with its label and VALID window, and paints no polygons', async () => {
    const f = setup()
    await flush()
    setOutlookDay(4)
    await flush()
    expect(getOutlookLoaded()).toEqual({
      day: 4,
      window: { valid: '202610141200', expire: '202610151200' },
      highest: null,
      emptyLabel: 'Predictability Too Low',
    })
    expect(f.setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] })
  })

  it('reports the highest category over the whole D1 outlook', async () => {
    setup()
    await flush()
    expect(getOutlookLoaded()).toMatchObject({ day: 1, highest: 'SLGT', emptyLabel: null })
  })
})
