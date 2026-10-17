# 0021. Rename the repo and image to `inflow`
Status: Accepted
Date: 2026-10-17
Amends: [ADR-0015](0015-inflow-design-system.md) (its "repo and package names stay `storm-chasers`" line).

## Context
The product is INFLOW, but the repo and Docker image were named `storm-chasers`. Launch posts would link "INFLOW" to `storm-chasers`, which looks like a rename someone never finished. Nobody depends on the old names yet: no release has shipped, and the test image was deleted.

## Decision
- The GitHub repo is `FurbySoup/inflow`. GitHub redirects the old URLs.
- The Docker image is `ghcr.io/furbysoup/inflow`.
- `REPO_URL` (proxy/routes.ts), the NWS User-Agent, the README, the launch posts, the issue-template links and the OCI labels all use the new name.
- **Unchanged on purpose:**
  - the browser storage keys (`storm-chasers.*`), because renaming them would wipe users' saved layouts and chasers;
  - the IndexedDB name;
  - the private npm package name, which the Claude Design sync imports;
  - the local folder name.

## Consequences
- Old clone URLs keep working through GitHub's redirect. Remotes should still be updated.
- None of the unchanged internal names are shown to users.
