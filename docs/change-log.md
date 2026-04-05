# Tethr Change Log

## Purpose

This file is the plain-English record of meaningful changes to the project.

Use it to capture:

- what changed
- when it changed
- what kind of change it was
- what documents or surfaces were affected

This is not the same as git history.

Git shows exact file diffs.
This file should explain the meaningful product, architecture, and design changes in human terms.

## Format

For each entry, capture:

- date
- summary
- type
- affected surfaces
- notes

Suggested types:

- architecture
- product
- design
- workflow
- implementation
- docs

## Entries

### 2026-04-04

Summary:

- Implemented the first real unified subject-view shell in the app for places, containers, and personal things/items.

Type:

- implementation
- design

Affected surfaces:

- [src/ui.js](/F:/Tethr/TethrArca/src/ui.js)
- [implementation-slice-home-results-subject.md](/F:/Tethr/TethrArca/docs/checklists/implementation-slice-home-results-subject.md)

Notes:

- Place, container, and item pages now share a calmer page rhythm: hero, overview, then the content section underneath.
- Added lightweight UI-layer adapters for location, container, and item detail payloads instead of changing backend shapes first.
- Kept edit, move, history, quantity, and media actions reachable from the new shells.
- Syntax and browser smoke checks passed; the dedicated subject-shell visual pass was partially blocked by local Playwright/browser-environment quirks, so move-flow validation still remains open.

### 2026-04-03

Summary:

- Promoted the architecture notes into a real master spec.

Type:

- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)

Notes:

- Added spec usage rules, status legend, Codex decision rules, build phases, and checklist backlog.
- The architecture file is now intended to act as the project's operational spec.

### 2026-04-03

Summary:

- Defined the core planning artifacts for Tethr's product shape.

Type:

- architecture
- design
- workflow

Affected surfaces:

- [unified-tethr-product-plan.md](/F:/Tethr/TethrArca/docs/unified-tethr-product-plan.md)
- [tethr-user-workflow-map.md](/F:/Tethr/TethrArca/docs/tethr-user-workflow-map.md)
- [tethr-visual-sitemap.md](/F:/Tethr/TethrArca/docs/tethr-visual-sitemap.md)
- [tethr-canonical-subject-page.md](/F:/Tethr/TethrArca/docs/tethr-canonical-subject-page.md)

Notes:

- Established the product map, workflow map, sitemap, and subject-page grammar as supporting design documents.

### 2026-04-03

Summary:

- Created interactive HTML mockups to make the planning work more visual.

Type:

- design
- docs

Affected surfaces:

- [tethr-explanatory-site.html](/F:/Tethr/TethrArca/docs/tethr-explanatory-site.html)
- [tethr-subject-tile-mockup.html](/F:/Tethr/TethrArca/docs/tethr-subject-tile-mockup.html)
- [tethr-canonical-subject-page-wireframe.html](/F:/Tethr/TethrArca/docs/tethr-canonical-subject-page-wireframe.html)

Notes:

- These mockups and concept pages exist to help review structure and design direction before implementation.

### 2026-04-03

Summary:

- Added the scan-first contribution rule to the master spec and supporting project logs.

Type:

- product
- workflow
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)
- [change-log.md](/F:/Tethr/TethrArca/docs/change-log.md)

Notes:

- Scanning or tapping an existing QR/NFC tag is now defined as an identity-anchor flow that opens the subject page and favors contribution over duplicate creation.

### 2026-04-03

Summary:

- Defined the relationship model between the major subject types in the master spec.

Type:

- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)

Notes:

- Clarified when to use `SubjectLink`, `Holding`, `UserSubjectRelation`, and `Event`, and documented the preferred relationship patterns for shared subjects, tracked instances, stored inventory, places, containers, and people.

### 2026-04-03

Summary:

- Added the Quick Add flow, shared-subject creation policy, and a broader subject-model pressure test to the master spec.

Type:

- product
- workflow
- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- Defined the canonical Quick Add flow, established a stricter creation policy for shared/public subjects, and pressure-tested the subject model against a wider example set including restaurants, books, movies, benches, furnaces, bottles, and gas cans.

### 2026-04-03

Summary:

- Added the Add Event flow and the unified front-page search rule to the master spec.

Type:

- product
- workflow
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- Defined Add Event as the canonical focused event-recording flow, and clarified that front-page search should return mixed subject types first and offer filtering afterward.

### 2026-04-03

Summary:

- Added the Find / Move / Retrieve flow and the scan move flow to the master spec.

Type:

- workflow
- product
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- Defined the normal retrieval and move path, clarified quantity-update behavior, and positioned scan move as a fast physical-world shortcut built on top of the same subject and current-state model.

### 2026-04-03

Summary:

- Added the canonical Photo / Media Flow to the master spec, including GPT handoff behavior, subject-vs-event photo rules, and detailed crop interaction rules.

Type:

- workflow
- product
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The spec now formalizes one shared media interaction model across the focused upload screen, regular web flows, event upload, and GPT handoff, with the crop slider starting in the middle so users can zoom out or in.

### 2026-04-03

Summary:

- Added the Collection / Relationship Flow to the master spec.

Type:

- workflow
- product
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- Defined personal relationship state and collection membership as distinct but adjacent overlays on existing subjects, and formalized the relationship picker, collection picker, and in-flow collection creation rules.

### 2026-04-03

Summary:

- Added new phase-based and feature-based implementation-prep checklists derived from the master spec.

Type:

- architecture
- docs
- workflow

Affected surfaces:

- [checklists/README.md](/F:/Tethr/TethrArca/docs/checklists/README.md)
- [phase-2-subject-model-and-state.md](/F:/Tethr/TethrArca/docs/checklists/phase-2-subject-model-and-state.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [feature-shared-subject-identity.md](/F:/Tethr/TethrArca/docs/checklists/feature-shared-subject-identity.md)
- [feature-media-system.md](/F:/Tethr/TethrArca/docs/checklists/feature-media-system.md)

Notes:

- The checklist system now mirrors both build phases and higher-risk feature areas so future work can be planned with less back-and-forth.

### 2026-04-04

Summary:

- Added the product north star, collection-first engagement principle, and UI language rules to the master spec.

Type:

- product
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The spec now explicitly centers Tethr around the feeling of collecting your own world, with `Tethr your world` as the north-star tagline and personal-first copy rules for the product.

### 2026-04-04

Summary:

- Added the mixed-type search result card grammar to the master spec.

Type:

- product
- design
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The search spec now defines one stable card shell for mixed-type results, with clear type cues and different emphasis by subject kind instead of separate result layouts for each domain.

### 2026-04-04

Summary:

- Added the universal personal-entry model, steward-created official subject path, and iconic home page direction to the planning docs.

Type:

- product
- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [feature-shared-subject-identity.md](/F:/Tethr/TethrArca/docs/checklists/feature-shared-subject-identity.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The planning system now reflects that shared-subject interaction should feel personally collectible, official owners should be able to create canonical records directly, and the home page should stay singular and minimal.

### 2026-04-04

Summary:

- Added the field-level personal-entry schema and shared-subject lifecycle to the master spec, and clarified the encounter-driven growth model.

Type:

- product
- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [feature-shared-subject-identity.md](/F:/Tethr/TethrArca/docs/checklists/feature-shared-subject-identity.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The planning docs now explicitly say that community encounter-driven growth is the default, official steward creation is supported but not primary, and shared subjects move through provisional, canonical, official, and merged states.

### 2026-04-04

Summary:

- Added a minimal account-access rule to the home-page planning and updated the homepage shell mockup accordingly.

Type:

- product
- design
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [tethr-home-shell-mockup.html](/F:/Tethr/TethrArca/docs/tethr-home-shell-mockup.html)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The home shell now includes a quiet account control for lists, recent items, settings, and sign-in state without turning the page into a full nav-heavy dashboard.

### 2026-04-04

Summary:

- Locked the home search flow to a separate results page, updated the homepage shell with an explicit submit action, and created a dedicated results-page mockup.

Type:

- product
- design
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [tethr-home-shell-mockup.html](/F:/Tethr/TethrArca/docs/tethr-home-shell-mockup.html)
- [tethr-results-page-mockup.html](/F:/Tethr/TethrArca/docs/tethr-results-page-mockup.html)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The home page now stays iconic and calm, while full mixed-type search results move to their own page with room for cards, filters, and later ranking.

### 2026-04-04

Summary:

- Added the default search ranking model and first-version filter behavior to the master spec, with the user's own records prioritized by default.

Type:

- product
- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [phase-3-core-user-flows.md](/F:/Tethr/TethrArca/docs/checklists/phase-3-core-user-flows.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The search system now has an explicit `Best match` philosophy, a first-version filter-chip model, and a future path for user-adjustable ranking preferences.

### 2026-04-04

Summary:

- Defined the first safe implementation slice as an additive `Home -> Results -> Subject View` shell over the current Arca system and created a dedicated checklist for it.

Type:

- product
- architecture
- docs

Affected surfaces:

- [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md)
- [implementation-slice-home-results-subject.md](/F:/Tethr/TethrArca/docs/checklists/implementation-slice-home-results-subject.md)
- [checklists/README.md](/F:/Tethr/TethrArca/docs/checklists/README.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)

Notes:

- The project now has an explicit low-risk path from planning into building: reuse the current APIs and proven edit/media flows, and layer the new Tethr shell on top first.

### 2026-04-04

Summary:

- Implemented the first real route-backed search results page in the app, with a dedicated `/search?q=...` flow, mixed result cards, first-version type filters, and `Best match` ranking.

Type:

- product
- implementation
- ui

Affected surfaces:

- [ui.js](/F:/Tethr/TethrArca/src/ui.js)
- [implementation-slice-home-results-subject.md](/F:/Tethr/TethrArca/docs/checklists/implementation-slice-home-results-subject.md)

Notes:

- The real app now separates submitted search from the rest of the shell, reuses the current search endpoint safely, and preserves the focused `/arca` image flows according to the browser smoke tests.

### 2026-04-04

Summary:

- Implemented the real iconic home shell at `/`, kept the current browse world reachable at `/places`, and wired the new home search into the dedicated results page.

Type:

- product
- implementation
- ui

Affected surfaces:

- [ui.js](/F:/Tethr/TethrArca/src/ui.js)
- [server.js](/F:/Tethr/TethrArca/src/server.js)
- [implementation-slice-home-results-subject.md](/F:/Tethr/TethrArca/docs/checklists/implementation-slice-home-results-subject.md)

Notes:

- The new shell is additive rather than destructive: the iconic home page now lives at `/`, the new mixed results live at `/search`, and the existing place/container/item world remains reachable at `/places` and deeper routes.
