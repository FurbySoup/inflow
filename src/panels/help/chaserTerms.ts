/**
 * Terms a viewer hears on chaser streams but won't see on INFLOW's own screen (ADR-0018 covers on-screen
 * acronyms in src/ui/glossary.ts). Shown in the help dialog's CHASER TERMS tab, grouped and searchable.
 * Written by the orchestrator, not generated: keep each meaning one or two plain sentences, and correct.
 */
export interface ChaserTerm {
  term: string
  /** Spelled out, when the term is an abbreviation. */
  stands?: string
  meaning: string
}

export interface ChaserTermGroup {
  group: string
  terms: ChaserTerm[]
}

export const CHASER_TERMS: readonly ChaserTermGroup[] = [
  {
    group: 'Storm structure',
    terms: [
      { term: 'Supercell', meaning: 'A thunderstorm with a deep, persistent rotating updraft. Most strong tornadoes come from supercells.' },
      { term: 'Mesocyclone', stands: 'meso', meaning: 'The rotating updraft inside a supercell, a few miles wide.' },
      { term: 'Updraft base', meaning: 'The flat, dark cloud base where warm moist air rises into the storm.' },
      { term: 'Wall cloud', meaning: 'A lowered, often rotating section of the updraft base. Tornadoes usually form from it.' },
      { term: 'Tail cloud', meaning: 'A ragged band of cloud feeding into the wall cloud from the rain side.' },
      { term: 'Shelf cloud', meaning: 'A low, wedge-shaped cloud on the leading edge of storm outflow. Signals strong wind, rarely tornadoes.' },
      { term: 'Scud', meaning: 'Ragged, low cloud fragments. Often mistaken for funnels; real rotation is organised and persistent.' },
      { term: 'Inflow', meaning: 'Warm, moist air flowing into a storm. Strong inflow at your back means you are near the updraft.' },
      { term: 'Outflow', meaning: 'Rain-cooled air rushing out of a storm. Cold outflow can undercut and weaken a storm.' },
      { term: 'Gust front', meaning: 'The leading edge of a storm’s outflow, often with a sudden wind shift.' },
      { term: 'RFD', stands: 'Rear-flank downdraft', meaning: 'Air descending on the back side of a supercell. Its arrival often precedes tornadogenesis.' },
      { term: 'FFD', stands: 'Forward-flank downdraft', meaning: 'The rain-cooled downdraft in the main precipitation area of a supercell.' },
      { term: 'Clear slot', meaning: 'A clearing wrapping around the wall cloud, carved by the RFD.' },
      { term: 'Core', meaning: 'The heaviest rain and hail part of the storm. Core punching means driving through it.' },
      { term: 'Rain-wrapped', meaning: 'A tornado hidden inside heavy rain. Extremely dangerous because it can’t be seen.' },
      { term: 'Anvil', meaning: 'The flat top of a thunderstorm spreading out at the tropopause.' },
      { term: 'Overshooting top', meaning: 'A dome of cloud punching above the anvil, a sign of a very strong updraft.' },
      { term: 'LP / Classic / HP', stands: 'Low-, classic- and high-precipitation supercell', meaning: 'Supercell types by how much rain falls near the updraft. HP storms often hide tornadoes in rain.' },
      { term: 'Right mover / left split', meaning: 'A storm can split in two; in the US the right mover usually rotates and produces tornadoes.' },
      { term: 'Tail-end Charlie', meaning: 'The southernmost storm in a line. It has the best inflow, so chasers favour it.' },
    ],
  },
  {
    group: 'Tornadoes',
    terms: [
      { term: 'Funnel cloud', meaning: 'A rotating condensation funnel that does not reach the ground.' },
      { term: 'Condensation funnel', meaning: 'The visible cloud of a tornado. The circulation can touch down before the funnel does.' },
      { term: 'Debris cloud', meaning: 'Dust and debris lofted at ground level. Proof that a circulation is on the ground.' },
      { term: 'Touchdown', meaning: 'The moment a tornado’s circulation reaches the ground.' },
      { term: 'Rope / rope-out', meaning: 'A thin, twisted tornado, usually in its dying stage.' },
      { term: 'Cone / stovepipe', meaning: 'Tornado shapes: a cone narrows to the ground; a stovepipe is a wide column.' },
      { term: 'Wedge', meaning: 'A tornado at least as wide as it is tall. Usually strong and long-lived.' },
      { term: 'Multi-vortex', meaning: 'A tornado with several smaller vortices orbiting inside it.' },
      { term: 'Satellite tornado', meaning: 'A separate tornado circling a larger parent tornado.' },
      { term: 'Landspout', meaning: 'A weak tornado from a growing cloud without a mesocyclone, not a supercell.' },
      { term: 'Gustnado', meaning: 'A brief whirl of dust on a gust front. Not attached to the cloud base.' },
      { term: 'Cyclic', meaning: 'A supercell producing several tornadoes in a row as new wall clouds form.' },
      { term: 'EF scale', stands: 'Enhanced Fujita scale', meaning: 'Tornado rating from EF0 to EF5, set by an NWS damage survey after the event.' },
      { term: 'Damage path', meaning: 'The track of a tornado on the ground, surveyed afterwards for length and width.' },
      { term: 'QLCS tornado', meaning: 'A tornado from a line of storms: brief, fast and often rain-wrapped and at night.' },
    ],
  },
  {
    group: 'Radar',
    terms: [
      { term: 'Reflectivity', stands: 'dBZ', meaning: 'How much the radar beam bounces back. Higher dBZ means heavier rain or hail.' },
      { term: 'Velocity', meaning: 'Radar wind toward (green) or away (red) from the radar.' },
      { term: 'Couplet', meaning: 'Strong inbound next to strong outbound velocity: a rotation signature.' },
      { term: 'TVS', stands: 'Tornado vortex signature', meaning: 'An automated radar flag for a tight, strong couplet.' },
      { term: 'Hook echo', meaning: 'A hook-shaped curl in reflectivity on a supercell’s rear flank, where tornadoes often are.' },
      { term: 'Debris ball', meaning: 'A small high-reflectivity blob at the hook’s tip: lofted debris from a tornado.' },
      { term: 'CC', stands: 'Correlation coefficient', meaning: 'How alike the radar targets are. A CC drop inside a couplet means debris: a confirmed tornado.' },
      { term: 'TDS', stands: 'Tornado debris signature', meaning: 'Low CC plus a couplet: radar evidence a tornado is lofting debris.' },
      { term: 'BWER', stands: 'Bounded weak echo region', meaning: 'A vault of weak echo under strong echo, made by an intense updraft.' },
      { term: 'Inflow notch', meaning: 'A notch in reflectivity where inflow enters the updraft.' },
      { term: 'Bow echo', meaning: 'A line of storms bulging forward. Expect damaging straight-line wind at the apex.' },
      { term: 'Beam height', meaning: 'The radar beam rises with distance, so far from a radar it misses low-level rotation.' },
      { term: 'SAILS', stands: 'Supplemental adaptive intra-volume low-level scan', meaning: 'Extra low-angle radar scans for faster updates near the ground.' },
    ],
  },
  {
    group: 'Ingredients and forecasting',
    terms: [
      { term: 'CAPE', stands: 'Convective available potential energy', meaning: 'Fuel for updrafts, in J/kg. Over 2000 is a lot.' },
      { term: 'CIN / cap', stands: 'Convective inhibition', meaning: 'A warm layer aloft that stops storms forming. "The cap breaks" means storms can go.' },
      { term: 'Shear', meaning: 'Wind changing speed or direction with height. It organises storms and makes them rotate.' },
      { term: 'SRH', stands: 'Storm-relative helicity', meaning: 'The low-level spin available to a storm’s updraft. High SRH favours tornadoes.' },
      { term: 'Dewpoint', stands: 'Td', meaning: 'A measure of low-level moisture. Mid-60s °F and up supports tornadoes.' },
      { term: 'LCL', stands: 'Lifted condensation level', meaning: 'The cloud base height. Low LCLs favour tornadoes.' },
      { term: 'Dryline', meaning: 'The boundary between moist Gulf air and dry desert air. A Plains storm trigger.' },
      { term: 'Warm front', meaning: 'Where warm air advances. Storms riding along it often turn tornadic.' },
      { term: 'Triple point', meaning: 'Where the dryline, cold front and warm front meet. A classic chase target.' },
      { term: 'Outflow boundary', meaning: 'An old storm’s outflow edge. New storms crossing it can rotate harder.' },
      { term: 'LLJ', stands: 'Low-level jet', meaning: 'Strong winds a few thousand feet up that ramp up in the evening, boosting shear.' },
      { term: 'STP', stands: 'Significant tornado parameter', meaning: 'An index combining CAPE, shear, SRH and LCL. Above 1 favours strong tornadoes.' },
      { term: 'CI', stands: 'Convective initiation', meaning: 'The moment new storms start forming.' },
      { term: 'Storm mode', meaning: 'How storms organise: discrete supercells (best for tornadoes), lines or clusters.' },
      { term: 'HRRR / NAM / GFS', meaning: 'Weather models. The HRRR updates hourly and shows storm-scale detail.' },
      { term: 'CAMs', stands: 'Convection-allowing models', meaning: 'High-resolution models that simulate individual storms.' },
      { term: 'MCS', stands: 'Mesoscale convective system', meaning: 'A large cluster or line of storms lasting hours. Mostly wind and flooding.' },
      { term: 'Derecho', meaning: 'A long-lived, widespread straight-line windstorm from a fast-moving MCS.' },
    ],
  },
  {
    group: 'Chasing and safety',
    terms: [
      { term: 'Target', meaning: 'The area a chaser picks in the morning, where storms are most likely to be tornadic.' },
      { term: 'Bust', meaning: 'A chase day with no storms, or none worth seeing.' },
      { term: 'Core punch', meaning: 'Driving through a storm’s rain and hail core to reach the tornado side. Risky.' },
      { term: "Bear's cage", meaning: 'The area under the mesocyclone, often rain-wrapped. The most dangerous place to be.' },
      { term: 'Road network', meaning: 'Paved roads and escape routes. Poor networks (forests, hills, rivers) make chasing dangerous.' },
      { term: 'Chaser convergence', meaning: 'Traffic jams of chasers near a storm. A real safety problem.' },
      { term: 'Positioning', meaning: 'Placing yourself southeast of a storm, out of the hail, with a view of the updraft.' },
      { term: 'Spotter', meaning: 'A trained volunteer who reports storms to the NWS. Reports feed warnings.' },
      { term: 'SKYWARN', meaning: 'The NWS storm spotter programme with free training classes.' },
      { term: 'Spotter Network', stands: 'SN', meaning: 'A service where chasers share live GPS positions and reports.' },
      { term: 'Ground truth', meaning: 'What is actually happening on the ground, which radar can’t see.' },
      { term: 'Nado', meaning: 'Slang for tornado.' },
    ],
  },
]
