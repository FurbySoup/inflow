/**
 * Plain-English expansions for every acronym and abbreviation the console shows (ADR-0018). Kit-level and
 * dependency-free. `Abbr` reads it for mouse-over tips; the help dialog lists it in full, so the meaning is
 * also reachable without hover (touch screens, keyboard).
 * Keys are the exact on-screen text. Keep entries short: one line, what it is and why it matters here.
 */
export const GLOSSARY: Readonly<Record<string, string>> = {
  // Area and time
  AOI: 'Area of interest: the area the map is showing. Every panel filters to it.',
  'IN AOI': 'Inside your area of interest (the area the map is showing)',
  UTC: 'Coordinated Universal Time, the clock forecasters use (shown with a Z, for Zulu)',
  Z: 'Zulu time, the same as UTC',
  LOCAL: 'The time on this device',
  'T-': 'Time left until the alert expires',
  // Agencies and products
  NWS: 'National Weather Service: issues watches and warnings',
  SPC: 'Storm Prediction Center: issues severe-weather outlooks, mesoscale discussions and watches',
  MD: 'Mesoscale discussion: an SPC note that a watch may be coming for a small area',
  HWO: 'Hazardous Weather Outlook: the local NWS office’s plain-language look at the next 7 days',
  CWA: 'County warning area: the region one NWS office covers',
  // NWS hazard codes (src/ui/hazard.ts)
  TOR: 'Tornado Warning: a tornado is happening or imminent. Take shelter.',
  SVR: 'Severe Thunderstorm Warning: damaging wind or large hail is happening or imminent',
  FFW: 'Flash Flood Warning: flash flooding is happening or imminent',
  TOA: 'Tornado Watch: conditions favour tornadoes. Be ready to act.',
  SVA: 'Severe Thunderstorm Watch: conditions favour severe storms',
  SPS: 'Special Weather Statement: a notable storm that is below warning level',
  OTHER: 'Another NWS alert type (advisories, statements)',
  PDS: 'Particularly dangerous situation: NWS wording for an unusually high-end threat',
  EMERGENCY: 'Tornado Emergency: a confirmed large tornado threatening a populated area',
  ZONE: 'Issued for whole counties or zones, not a storm polygon, so it can’t be focused on the map',
  // SPC outlook categories, lowest to highest
  TSTM: 'SPC outlook: general (non-severe) thunderstorms',
  MRGL: 'SPC outlook level 1 of 5, Marginal: isolated severe storms possible',
  SLGT: 'SPC outlook level 2 of 5, Slight: scattered severe storms possible',
  ENH: 'SPC outlook level 3 of 5, Enhanced: numerous severe storms possible',
  MDT: 'SPC outlook level 4 of 5, Moderate: widespread severe storms likely',
  HIGH: 'SPC outlook level 5 of 5, High: a widespread severe-weather outbreak is expected',
  // Radar and satellite
  NEXRAD: 'The US network of weather radars (WSR-88D)',
  SRV: 'Storm-relative velocity: radar winds with the storm’s motion removed, so rotation stands out',
  GOES: 'The NOAA weather satellites (East and West)',
  IR: 'Infrared: cloud-top temperature; colder (higher) tops show brighter',
  // Streams and cameras
  CTX: 'Context feed: background video, not a storm chaser',
  THUMB: 'Thumbnail: a still image of the stream, up to 5 minutes old',
  CAM: 'Camera or stream slot number',
  DOT: 'Department of Transportation: state road agencies that run the traffic cameras',
  CCTV: 'Closed-circuit TV: road and traffic cameras',
  // Radio
  CB: 'Citizens Band radio. Channel 19 is the truckers’ and chasers’ channel.',
  '2M': 'The 2-metre amateur (ham) radio band, used by storm spotters',
  RX: 'Receiver: an online radio you can listen through',
  TG: 'Talkgroup: one channel on a digital trunked radio system',
  SDR: 'Software-defined radio: a receiver you tune in a web browser',
  KIWISDR: 'KiwiSDR: volunteer-run radio receivers you tune in a web browser. They open on their own page.',
  OPENMHZ: 'OpenMHz: a public archive of recorded trunked-radio calls (police, fire, EMS), played here',
  MHZ: 'Megahertz: radio frequency. CB is around 27 MHz; the 2-metre band is 144–148 MHz.',
  KM: 'Kilometres from the centre of your area of interest',
  EXP: 'Expires: time left until the soonest tornado warning ends',
  SN: 'Spotter Network: a service where chasers share live GPS positions. Opens their map.',
  THUMBS: 'Thumbnails: still images refreshed about every 5 minutes. ▶ WATCH plays one.',
  // AOI presets (src/panels/aoiPresetData.ts)
  PLAINS: 'Preset: the Great Plains, Texas to the Dakotas border (104°–94° W)',
  DIXIE: 'Preset: Dixie Alley, the tornado-prone Deep South from Louisiana to Tennessee',
  SE: 'Preset: the Southeast, Georgia and South Carolina (the default area)',
}

/** Console panel designators (the code before a panel title, e.g. `WX-02`). */
const PANEL_PREFIXES: Readonly<Record<string, string>> = {
  WX: 'Weather panel',
  VID: 'Video panel',
  AUD: 'Audio panel',
  CCTV: 'Road camera panel',
  SAT: 'Satellite panel',
  SPC: 'SPC outlook panel',
}

/** The expansion for an on-screen term, or for a panel code such as `WX-02`. Undefined when there is none. */
export function expand(term: string): string | undefined {
  const direct = GLOSSARY[term]
  if (direct) return direct
  const prefix = /^([A-Z]+)-\d+$/.exec(term)?.[1]
  return prefix ? PANEL_PREFIXES[prefix] : undefined
}
