# Tethr Decision Log

## Purpose

This file records major project decisions and the reasoning behind them.

Use it to capture:

- what decision was made
- why it was made
- what alternatives were considered
- whether the decision is stable or still provisional

This is different from the change log.

- the change log says what changed
- the decision log says why we chose the direction we chose

## Format

For each entry, capture:

- date
- decision
- status
- reasoning
- alternatives considered
- implications

Suggested statuses:

- decided
- provisional
- revisiting

## Entries

### 2026-04-03

Decision:

- Tethr should feel like one unified subject system, not three separate apps.

Status:

- decided

Reasoning:

- The product spans inventory, history, curation, and public contribution, but users should still feel like they are interacting with one subject system.
- Separate app-like experiences would increase friction and make the system feel fragmented.

Alternatives considered:

- treat Arca, Terra, and Aura as visibly separate app sections
- build distinct UI logic by subject family

Implications:

- one page grammar
- one action language
- one navigation logic
- context-sensitive emphasis instead of separate app structures

### 2026-04-03

Decision:

- The words `Arca`, `Terra`, and `Aura` may remain mostly internal rather than being required user-facing vocabulary.

Status:

- provisional

Reasoning:

- These words are useful for architecture, but users likely benefit more from direct concepts like subject, state, history, collections, and photos.

Alternatives considered:

- expose Arca / Terra / Aura directly as visible user-facing sections

Implications:

- user-facing UI should stay simple and task-oriented
- the architecture can still use the deeper model behind the scenes

### 2026-04-03

Decision:

- Quantity belongs only to Arca.

Status:

- decided

Reasoning:

- Quantity is an inventory/current-state concern, not a shared-identity concern and not inherently an instance-history concern.

Alternatives considered:

- attach quantity to every subject type
- attach quantity to Terra instances

Implications:

- stored inventory and placement flows become cleaner
- shared subjects and tracked instances avoid awkward quantity semantics

### 2026-04-03

Decision:

- The subject page is the canonical "exploded" view of a record, while tiles remain compact previews.

Status:

- decided

Reasoning:

- This creates a stable hierarchy:
  - preview in lists/grids
  - full record page for understanding and action
  - focused one-job screens for fast execution

Alternatives considered:

- make tiles carry more operational detail
- rely heavily on modal-only interactions

Implications:

- subject pages become the central design problem
- tiles should stay lightweight and legible

### 2026-04-03

Decision:

- Focused one-job screens are a valid and important part of Tethr when they reduce friction.

Status:

- decided

Reasoning:

- Uploading photos, adding events, and moving objects are often single-task moments that should not require navigating a full edit surface.

Alternatives considered:

- do everything only on full subject pages
- use one giant edit modal for all operations

Implications:

- focused upload, add-event, and move flows are part of the intended system design

### 2026-04-03

Decision:

- QR and NFC should act as canonical identity anchors, and scanning an existing subject should default to contribution rather than duplicate creation.

Status:

- decided

Reasoning:

- If a subject already has a Tethr identity, scanning should reinforce that identity and route the user into the existing subject page.
- This makes public and shared contribution much cleaner and reduces accidental duplicate records.
- It also creates a consistent rule across physical tags, GPT-assisted flows, and web creation flows: find first, contribute if found, create only when truly needed.

Alternatives considered:

- treat scan as a generic creation entry point
- send scans directly into narrow one-off forms without anchoring identity on the subject page

Implications:

- `TagBinding` should point to subject identity, not a transient task screen
- scanned subject pages should prioritize contribution actions like photo, note, visit, and rating
- create-subject and contribute-to-subject must remain distinct flows

### 2026-04-03

Decision:

- Shared/public subjects should use a search-first, domain-aware creation policy rather than a generic blank creation form.

Status:

- provisional

Reasoning:

- Shared subjects must remain clean enough that many users can attach to the same identity over time.
- GPT can help infer domain and likely matches, but the web app should still use structured creation to reduce duplicates and formatting drift.
- Different domains such as restaurants, books, movies, whiskies, and landmarks need different required fields and matching logic.

Alternatives considered:

- allow a generic freeform "create shared subject" flow in the web app
- rely only on later moderation and merging to clean up duplicates

Implications:

- shared-subject creation should prefer seeded data, GPT-assisted creation, or structured web creation
- shared-subject creation likely needs a domain-profile concept and stronger identity-reference data over time
- duplicate prevention is a core product concern, not an afterthought

### 2026-04-03

Decision:

- The front page search should be one unified search surface that shows all matching subject kinds first and lets the user filter afterward.

Status:

- decided

Reasoning:

- Users should not have to decide in advance whether they are looking for a place, container, tracked instance, shared subject, or inventory record.
- Showing all plausible matches first keeps search friction low and better matches the way people think: "find the thing," not "choose the database first."

Alternatives considered:

- split search by subject family before results appear
- require the user to choose a search category up front

Implications:

- result lists will often be mixed-type
- result cards need strong type cues while staying visually unified
- filters become a refinement step, not a prerequisite to seeing results

### 2026-04-03

Decision:

- Move and scan move should be focused action flows layered on top of canonical subject identity, not separate mini-systems.

Status:

- decided

Reasoning:

- The user should always be able to understand what is moving, where it is going, and what the resulting current state will be.
- Scan move should make physical organization faster, but it should still rely on the same subject model and current-state rules as ordinary move actions.

Alternatives considered:

- bury move inside a generic full edit form
- let scan move behave like a special standalone workflow with different underlying rules

Implications:

- move should start from search, subject pages, scan results, or GPT intent but complete as one focused flow
- scan move should prefill source and destination through scan order, then commit the same underlying move action
- updated state should always be visible on the subject page afterward

### 2026-04-03

Decision:

- Media upload and cropping should use one consistent interaction model across focused upload, regular web upload, event upload, and GPT handoff.

Status:

- decided

Reasoning:

- Users should not have to relearn image behavior depending on where upload starts.
- The current product already benefits from consistent preview and crop behavior, and formalizing that consistency will reduce UI sprawl later.
- Starting the crop slider in the middle allows users to both zoom out and zoom in, which is materially better than a one-direction crop model.

Alternatives considered:

- allow each surface to evolve its own upload interaction
- treat GPT upload as a separate kind of media system
- start crop zoom at one end of the range

Implications:

- subject upload, event upload, focused upload, and GPT handoff should all share the same media interaction grammar
- crop slider default should remain centered
- subject photo and event photo roles must stay distinct even if the UI surfaces both together

### 2026-04-03

Decision:

- Personal relationships and collection membership should be lightweight overlays on top of existing subjects, not separate duplicated records.

Status:

- decided

Reasoning:

- Users need to say both "what this subject means to me" and "which groups I want it in," but that should not fracture identity.
- Keeping relationship state in `UserSubjectRelation` and grouping in `Collection` / `CollectionItem` preserves one subject model while still supporting rich personal organization.

Alternatives considered:

- create separate personal subject copies inside collections
- collapse relationship and collection into one ambiguous mechanism

Implications:

- the product needs both a relationship picker and a collection picker
- subject pages should show personal overlay state clearly
- manual collections should come before smart collections

### 2026-04-04

Decision:

- The emotional center of Tethr should be personal collecting, expressed by the tagline `Tethr your world`.

Status:

- decided

Reasoning:

- Users are more naturally motivated by collecting their own things, places, memories, taste, and experiences than by the idea of contributing to a community dataset.
- Shared insight, owner benefit, and cross-subject analysis are valuable byproducts, but they should not be the primary emotional framing.

Alternatives considered:

- frame the product mainly around contribution, feedback, or community participation
- emphasize platform data collection as the main narrative

Implications:

- UI language should prefer `Save`, `Add to my list`, `Log my experience`, and similar personal-first phrasing
- owner/steward tooling should have a distinct language layer from everyday user collection actions
- the product should feel like a personal collection system first, even when shared subjects and aggregate insight exist behind it

### 2026-04-04

Decision:

- Mixed-type search results should use one stable card shell with clear type cues and type-specific emphasis rather than separate result layouts per domain.

Status:

- decided

Reasoning:

- The front page search is intended to show matches across places, containers, items, tracked instances, and shared subjects all at once.
- A stable card shell keeps the search surface calm and learnable, while type cues and emphasis keep the results legible.

Alternatives considered:

- separate search result layouts for each subject kind
- domain-specific result widgets that make the search page feel fragmented

Implications:

- result cards should prioritize recognition and opening over dense detail
- type labels and one line of current state or personal overlay become very important
- the first version should keep search cards compact rather than turning them into mini subject pages

### 2026-04-04

Decision:

- Shared-subject interaction should use a universal personal-entry model, while official owners and stewards should be able to create the canonical subject directly.

Status:

- provisional

Reasoning:

- Users are most motivated by building their own lists and logging their own experiences, so the default interaction with shared subjects should feel personal and consistent across domains.
- At the same time, brands, studios, venues, and other stewards need a way to ensure the official subject is correctly represented from the start.

Alternatives considered:

- make every domain use a custom contribution form as the default
- rely on users to create canonical shared subjects before owners appear

Implications:

- the universal personal-entry layer should stay simple: rating, comment, optional photo
- owner-added prompts should be additive rather than replacing the base entry model
- steward-created subjects should become the preferred canonical official records

### 2026-04-04

Decision:

- The home page should be singular, iconic, and minimal, centered on the `Tethr your world.` statement and one primary input.

Status:

- provisional

Reasoning:

- The product should feel calm, personal, and memorable at the point of entry.
- A single central field supports the idea that the user can begin with anything, while avoiding dashboard clutter before intent exists.

Alternatives considered:

- start with a dense dashboard of modules and widgets
- use a busier multi-control homepage as the primary first impression

Implications:

- the homepage should stay visually spare until the user interacts
- search and result grammar become even more important because the page has very little else on it

### 2026-04-04

Decision:

- Shared-subject growth should be community encounter-driven by default, while steward-created official subjects remain a supported but non-primary path.

Status:

- provisional

Reasoning:

- It is unrealistic to expect owners to preload the world, and the system should be able to grow organically from what users actually touch.
- At the same time, official owners need a clean path to ensure their important subjects are represented correctly when they care enough to do so.

Alternatives considered:

- assume owner-created official subjects are the main growth engine
- rely only on community-created shared subjects with no strong official path

Implications:

- most shared subjects will likely begin as provisional community-created records
- official-owner creation and claiming must be supported, but should not dominate the mental model
- duplicate handling and lifecycle transitions become especially important

### 2026-04-04

Decision:

- The universal personal-entry model should be field-simple and product-consistent: rating, comment, optional photo, timestamp, and user context.

Status:

- provisional

Reasoning:

- Shared subjects should feel consistent to interact with across domains, and users should be able to leave a meaningful personal record without heavy structure.
- This simple layer still generates highly valuable data for AI analysis and owner insight, especially when combined across many users and subjects.

Alternatives considered:

- make domain-specific forms the default for all shared-subject interaction
- avoid defining a universal personal-entry payload at the product level

Implications:

- the first-version product can keep shared-subject interaction simple
- owner-added prompts remain optional overlays rather than default complexity
- the underlying implementation may map one simple personal-entry action onto several deeper records

### 2026-04-04

Decision:

- The home page may include one quiet account-access control, but it should not grow into a full top navigation bar.

Status:

- provisional

Reasoning:

- Users still need a clean way to reach their lists, settings, and signed-in state.
- A single restrained utility control preserves the iconic, minimal front page while still giving access to the personal side of the product.

Alternatives considered:

- no account access from the home shell
- a full top navigation system competing with the main hero and search field

Implications:

- a subtle top-right control is preferred
- lists and settings remain reachable without cluttering the opening view
- the headline and primary search field remain the dominant visual elements

### 2026-04-04

Decision:

- The iconic home page should submit search into a dedicated results page rather than expanding into a full live-results surface.

Status:

- decided

Reasoning:

- Keeping the home page calm and iconic is more important than showing full mixed-type results immediately under the field.
- A dedicated results page gives Tethr room for richer mixed-type cards, filters, and sorting without turning the front door into a cluttered dashboard or an expensive live-query surface.

Alternatives considered:

- populate the lower half of the home page with full live results while typing
- rely on live results only and avoid an explicit submit/search action

Implications:

- the home page should support both keyboard `Enter` and an explicit submit/search button
- the results page becomes the primary surface for mixed-type search, filters, and ranking
- lightweight suggestions may still exist later, but they should not replace the dedicated results page

### 2026-04-04

Decision:

- Search should prioritize the user's own Arca/Terra-style records by default, with shared-subject matches following behind unless the user changes that preference later.

Status:

- decided

Reasoning:

- Most searches are likely attempts to find something the user owns, tracks, stores, or has already attached to their own world.
- Prioritizing the user's actionable records makes search feel more personal and useful, while still leaving room for the broader shared world to appear in the same result set.

Alternatives considered:

- treat all matching subject kinds equally with no strong personal ranking bias
- prioritize shared subjects first because they are more universal

Implications:

- `Best match` should favor personal and actionable records first
- top-level filters can narrow the mixed set afterward without changing this default philosophy
- a later settings control may allow the user to choose between `Prioritize my records`, `Balanced`, and `Prioritize shared subjects`

### 2026-04-04

Decision:

- The first implementation move should be an additive `Home -> Results -> Subject View` shell layered over the current working Arca system rather than a backend-first rewrite.

Status:

- decided

Reasoning:

- The current app already has working search, detail APIs, move flows, photo upload, and focused `/arca` editing.
- The safest way to make the product feel more like unified Tethr is to improve the shell and navigation model first while preserving the proven flows underneath.

Alternatives considered:

- continue architecture work much longer before building
- begin with schema unification or deeper backend refactors
- replace current creation and edit flows immediately

Implications:

- the first build slice should be non-destructive
- current endpoints and edit flows should be reused through UI-layer adapters where possible
- the new shell should focus first on places, containers, and personal things/items before deeper shared-subject work
