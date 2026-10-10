// Iowa Environmental Mesonet NEXRAD base reflectivity composite (keyless XYZ tiles, ~5 min updates).
export const IEM_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/'

// Valid time of the current composite (UTC, `meta.valid`). CORS `*`.
export const IEM_RADAR_VALID_URL =
  'https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json'

export const RADAR_REFRESH_MS = 5 * 60_000
