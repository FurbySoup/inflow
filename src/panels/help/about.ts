// Content for the ABOUT tab in `? HELP` (WP-47) and the README's data table. Orchestrator-written: the
// disclaimer, terms and credits must be accurate, so packages render this file and never edit it.

export const DISCLAIMER =
  'Not for life-safety decisions. Follow official National Weather Service warnings and your local officials.'

/** How the data is used, stated plainly (ADR-0020, launch-plan §3). */
export const DATA_TERMS: readonly string[] = [
  'INFLOW is self-run for personal use: your own machine fetches every feed directly from its public source. Nothing is hosted or relayed by the author.',
  'Feeds are best-effort and community-maintained. A source that changes or goes down shows on its panel light and does not break the rest of the screen.',
  'Stream "live" status is read from public YouTube pages, so it can lag or break when YouTube changes.',
  'No accounts, no API keys, and no tracking by INFLOW. Settings stay in your browser. Embedded YouTube players follow YouTube’s own privacy policy.',
]

export interface Credit {
  /** What it provides on screen. */
  what: string
  /** Who provides it, as they ask to be credited. */
  who: string
  /** Public home page, opened in a new tab. */
  url: string
  /** Licence or terms note, when there is one worth stating. */
  note?: string
}

export const CREDITS: readonly Credit[] = [
  {
    what: 'Warnings, watches, Hazardous Weather Outlooks, forecast points',
    who: 'NOAA National Weather Service',
    url: 'https://www.weather.gov/',
    note: 'Federal government work, public domain',
  },
  {
    what: 'Convective outlooks, mesoscale discussions, watches, storm reports',
    who: 'NOAA Storm Prediction Center',
    url: 'https://www.spc.noaa.gov/',
    note: 'Federal government work, public domain',
  },
  {
    what: 'NEXRAD radar mosaic and single-site velocity, GOES satellite, SPC watch and MD shapes',
    who: 'Iowa Environmental Mesonet, Iowa State University',
    url: 'https://mesonet.agron.iastate.edu/',
    note: 'IEM asks to be credited',
  },
  {
    what: 'GOES satellite fallback',
    who: 'NOAA nowCOAST',
    url: 'https://nowcoast.noaa.gov/',
    note: 'Federal government work, public domain',
  },
  {
    what: 'Scanner audio',
    who: 'OpenMHz',
    url: 'https://openmhz.com/',
  },
  {
    what: 'HF / ham / CB receivers (link-out)',
    who: 'KiwiSDR receiver owners, via the rx.linkfanel.net directory',
    url: 'http://rx.linkfanel.net/',
  },
  {
    what: 'Chaser and newsroom livestreams',
    who: 'YouTube embeds; each stream belongs to its channel',
    url: 'https://www.youtube.com/',
  },
  {
    what: 'Basemap',
    who: 'OpenFreeMap, map data © OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    note: 'OpenStreetMap data is ODbL',
  },
  {
    what: 'Map rendering',
    who: 'MapLibre GL JS',
    url: 'https://maplibre.org/',
    note: 'BSD-3-Clause',
  },
]

/** DOT traffic cameras: one credit per site, matching the panel's per-tile attribution (`site`). */
export const CAMERA_CREDITS: readonly { site: string; agency: string; states: string }[] = [
  { site: 'KanDrive', agency: 'Kansas DOT', states: 'KS' },
  { site: 'Nebraska 511', agency: 'Nebraska DOT', states: 'NE' },
  { site: 'TxDOT', agency: 'Texas DOT', states: 'TX' },
  { site: '511GA', agency: 'Georgia DOT', states: 'GA' },
  { site: 'FL511', agency: 'Florida DOT', states: 'FL' },
  { site: '511SC', agency: 'South Carolina DOT', states: 'SC' },
  { site: '511IA', agency: 'Iowa DOT', states: 'IA' },
  { site: '511MN', agency: 'Minnesota DOT', states: 'MN' },
  { site: '511IN', agency: 'Indiana DOT', states: 'IN' },
  { site: 'AZ511', agency: 'Arizona DOT', states: 'AZ' },
  { site: '511 Idaho', agency: 'Idaho Transportation Department', states: 'ID' },
  { site: '511 Alaska', agency: 'Alaska DOT', states: 'AK' },
  { site: '511LA', agency: 'Louisiana DOT', states: 'LA' },
  { site: 'CTroads', agency: 'Connecticut DOT', states: 'CT' },
  { site: 'NVroads', agency: 'Nevada DOT', states: 'NV' },
  { site: '511PA', agency: 'PennDOT', states: 'PA' },
  { site: 'New England 511', agency: 'Vermont, New Hampshire and Maine DOTs', states: 'VT, NH, ME' },
  { site: 'WSDOT', agency: 'Washington State DOT', states: 'WA' },
  { site: 'Caltrans', agency: 'California DOT', states: 'CA' },
]

export const PROJECT = {
  name: 'INFLOW',
  descriptor: 'storm situation room',
  repo: 'https://github.com/FurbySoup/inflow',
  licence: 'MIT',
} as const
