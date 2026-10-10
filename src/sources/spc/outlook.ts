import type { SourceAdapter } from '../types'

export const SPC_OUTLOOK_URL = 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson'

// Static GeoJSON from SPC (CORS *). Features carry LABEL plus fill/stroke colours in properties.
export const spcOutlook: SourceAdapter<GeoJSON.FeatureCollection, GeoJSON.Feature> = {
  id: 'spc-outlook',
  refreshMs: 120_000,
  async fetch(_aoi, signal) {
    const res = await fetch(SPC_OUTLOOK_URL, { signal })
    if (!res.ok) throw new Error(`SPC outlook ${res.status}`)
    return res.json()
  },
  normalize(raw) {
    return raw.features
  },
}
