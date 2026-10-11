# Architecture Decision Records

Short, numbered, immutable. To change a decision, add a new ADR that supersedes the old one and update its status line.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-client-only-spa.md) | Client-only Vite + React + TypeScript SPA | Accepted |
| [0002](0002-source-adapter-contract.md) | Source adapter contract and shared types | Accepted |
| [0003](0003-area-of-interest-state.md) | Area of interest is the only cross-panel state | Accepted |
| [0004](0004-v1-data-sources.md) | v1 data sources (US, keyless) | Accepted |
| [0005](0005-proxy-strategy.md) | Dev proxy now, edge proxy when hosted | Accepted |
| [0006](0006-audio-free-sources-only.md) | Audio: free/embeddable sources only | Accepted |
| [0007](0007-mission-control-ui.md) | Mission-control UI and design tokens | Accepted |
| [0008](0008-map-layer-registry.md) | Map layer registry | Accepted |
| [0009](0009-curated-livestreams.md) | Curated livestreams, no YouTube API in v1 | Accepted |
| [0010](0010-parallel-subagent-factory.md) | Parallel build via Haiku sub-agent factory | Accepted |
| [0011](0011-layout-customization.md) | Layout customization | Accepted |
| [0012](0012-affordances-and-signifiers.md) | Interaction design: affordances, signifiers, feedback (Norman) | Accepted |
| [0013](0013-stream-liveness.md) | Stream liveness via a YouTube page proxy (local only) | Accepted |
| [0014](0014-responsive-tiers.md) | Responsive tiers: screen sizes and orientations | Accepted |
| [0015](0015-inflow-design-system.md) | INFLOW v1 design system and design-wave ownership | Accepted |
| [0016](0016-nationwide-aoi-states.md) | Nationwide AOI states from simplified Census shapes | Accepted |
| [0017](0017-user-started-stream-tiles.md) | User-started stream tiles may play | Accepted |

Template:

```md
# NNNN. Title
Status: Proposed | Accepted | Superseded by NNNN
Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```
