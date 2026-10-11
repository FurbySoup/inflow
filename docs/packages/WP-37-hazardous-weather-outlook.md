# WP-37 — Hazardous Weather Outlook (HWO) for the AOI
Wave 9 · Depends on WP-34 (`nwsPoint`, merged) · ADRs: 0002, 0005, 0012, 0014, 0018

## Goal
The local NWS office writes a plain-language Hazardous Weather Outlook (HWO) every morning. It's the best "what's coming here this week" text there is. Show the latest HWO for the AOI's office at the top of the NWS Alerts panel: collapsed to one line, expandable to the Day One text, with a link to the full product.

## Owns
- `src/sources/nws/hwo.ts` (+ `hwo.test.ts`, `fixtures/hwo-*.json`);
- `src/panels/HwoStrip.tsx` (+ test);
- the acronym tags in `src/panels/AlertsList.tsx` (ADR-0018: any static acronyms the panel itself renders).

Registry edit allowed: render `<HwoStrip />` as the first child inside the `AlertsList` panel body (one element + import).

## Forbidden
`src/lib/*`, `src/state/*`, `src/ui/*`, `vite.config.ts` (`/api/nws` exists), `src/sources/nws/alerts.ts`, `src/sources/nws/points.ts` (import `nwsPoint` read-only).

## Verified facts (2026-10-11, curl; re-checked by the Wave 9 research)
- `GET /api/nws/products/types/HWO/locations/{CWA}` (proxy adds the User-Agent) → `application/ld+json`.
  - `@graph[]` is newest first, with `id, issuanceTime, issuingOffice, productCode, productName`.
  - FFC had 22 items on 2026-10-11, the latest at 09:51Z.
- **Shortcut:** `GET /api/nws/products/types/HWO/locations/{CWA}/latest` returns the full newest product (with `productText`) in one call. Use it.
- **Not every office has an HWO in the API.** 43 offices had one in the last 7 days; CAE, GSP, CHS, OUN, BMX and TAE returned an empty `@graph`, and their `/latest` returns **HTTP 500**.
  - An empty list, a 404 or a 500 means **no HWO**: normalize to `[]`, never an error state.
  - Offices that work today include FFC, TSA, ICT, AMA, LUB, SGF, PAH, MRX, IND, ILN, DVN and MPX.
- `GET /api/nws/products/{id}` → `productText` (plain text with `\n`), `issuanceTime`, `issuingOffice`.
  - The text: WMO header, title and office lines, a UGC line (`GAZ001>009-...-121800-`), a county list, then "This Hazardous Weather Outlook is for …".
  - Then dot-headed sections: `.DAY ONE...This Afternoon and Tonight...`, `.DAYS TWO THROUGH SEVEN...`, `.SPOTTER INFORMATION STATEMENT...`.
  - Split on `^\.[A-Z ]+\.\.\.`; the product ends at `$$`. A sample is in the orchestrator's research notes; record your own trimmed fixtures by curl with a User-Agent.
- The CWA comes from `nwsPoint` (`NwsPoint.cwa`, e.g. `FFC`). Offshore → no point → no strip.
- Full-text link (verified 200, the text contains "Hazardous Weather Outlook"): `https://forecast.weather.gov/product.php?site={CWA}&issuedby={CWA}&product=HWO&format=txt`.
- HWO is issued about once a day, plus updates, so poll every 30 min.

## Build
- **`hwo.ts`:**
  - an adapter `nwsHwo` whose fetch reads the CWA for the AOI centre via `nwsPoint`'s own fetch, then `/latest` for that CWA;
  - cache by CWA and product id, so a pan inside the same office makes no new product request;
  - pure `parseHwo(text)` returns `{ dayOne, daysTwoToSeven, spotter }`, each trimmed, with line breaks joined into paragraphs;
  - `normalize` gives `[{ cwa, issued, dayOne, daysTwoToSeven, spotterActivation: boolean, url }]`. `spotterActivation` is false when the spotter section says activation "is not expected";
  - no CWA → `[]`.
- **`HwoStrip.tsx`:** one row inside the alerts panel.
  - Collapsed: `▸ HWO · FFC · ISSUED 0951Z · SPOTTERS: NOT NEEDED`, a button with `aria-expanded`.
  - Expanded: the Day One paragraph, the Days 2–7 paragraph in `muted`, and `FULL TEXT ↗` (a link-out, `target=_blank rel=noopener noreferrer`).
  - Tag `HWO` and `CWA`-style office codes with `Abbr` (HWO is in the glossary; an office code gets `title="NWS office"`).
  - Loading: nothing. Error: `HWO UNAVAILABLE` (muted, not an error banner; the alerts feed has its own status).
  - Sentence case for the body text (HANDOFF voice: product text is body copy, not a console label).
  - No fixed widths; text wraps at 390 px.

## Acceptance
- [ ] `hwo.test.ts`:
  - `parseHwo` on two real fixtures (save a trimmed `productText` from FFC, and from a Plains office such as TSA or ICT);
  - the spotter flag both ways;
  - no CWA → `[]`;
  - a 500 or an empty `/latest` → `[]` with no throw;
  - a second fetch for the same CWA reuses the product (mock `fetch`).
- [ ] `HwoStrip` render test: collapsed by default; expands on click; the link-out has the correct URL.
- [ ] Orchestrator live check: default AOI shows FFC's HWO; pan to Tulsa → TSA; pan to Columbia SC (CAE, no HWO in the API) → no strip and no error; offshore → no strip; 390×844 wraps cleanly.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
