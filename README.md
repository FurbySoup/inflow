# Storm Chasers

A mission-control style, single-screen view of a live US severe-weather situation: NEXRAD radar, NWS warnings, chaser livestreams, scanner/ham/CB audio, DOT traffic cameras, SPC outlooks and GOES satellite — all following one area of interest on the map.

**Status:** v1 prototype, runs locally. No accounts, no API keys.

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173. The default view is the Georgia/South Carolina outbreak of 2026-10-10, used for live proofing.

## Docs
- [Architecture decisions](docs/adr/README.md)
- [v1 work plan](docs/work-plan.md) and [work packages](docs/packages/)
- [Roadmap beyond v1 / hosting](docs/roadmap.md)

## Data
Public-domain and freely accessible sources: National Weather Service, Storm Prediction Center, Iowa Environmental Mesonet (NEXRAD, GOES), OpenMHz, KiwiSDR, state DOT traveler information systems, YouTube embeds. See [ADR-0004](docs/adr/0004-v1-data-sources.md) for endpoints and terms status. Not for life-safety decisions — follow official NWS warnings.

## Licence
[MIT](LICENSE). Not for life-safety decisions: follow official NWS warnings.
