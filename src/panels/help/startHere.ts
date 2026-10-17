// Content for the START HERE tab in `? HELP` (WP-52): how the screen works, for someone who has never seen it.
// Orchestrator-written from the code (StatusLed shapes, layout PRESETS, roster scheduler). Packages render it and
// never edit it. Keep each step to one or two plain sentences.

export interface StartStep {
  title: string
  body: string
}

export const START_HERE: readonly StartStep[] = [
  {
    title: 'Pick an area',
    body: 'Pan or zoom the map, or press PLAINS, DIXIE or SE. Every panel then shows only that area: warnings, chasers, radio and road cameras.',
  },
  {
    title: 'Read the panel lights',
    body: 'Each panel has a light. ● live · ◌ loading · ◐ data is getting old · ■ the source has an error · ○ offline. A broken source only affects its own panel.',
  },
  {
    title: 'Chasers appear when they go live',
    body: 'INFLOW checks a list of 58 chasers and storm-coverage channels on YouTube, one every 10 seconds, so the first full sweep takes about 10 minutes (CHECKED x/58). Live chasers join the feeds by themselves. Add others with + CHASER.',
  },
  {
    title: 'Choose a layout',
    body: 'DEFAULT shows everything. WALL gives the map, warnings and video the room, for a TV or second monitor. CHASE keeps one stream, the radio and the warnings, for a laptop in the car. Shift+1, 2, 3 switch between them.',
  },
  {
    title: 'Get told about warnings',
    body: 'Tornado warnings in the map view pop up on screen. For browser notifications: press NOTIFY, tick the box, choose Allow, then SEND TEST. They arrive while this tab is in the background, not when it is closed.',
  },
  {
    title: 'On a quiet day',
    body: 'Most streams are offline and the warning list may be empty. That is normal. Use the SPC days (D1 to D8) on the map to see where storms are expected next.',
  },
]
