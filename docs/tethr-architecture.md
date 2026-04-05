# Tethr Master Spec

## Purpose

This is the main living architecture file for Tethr.

It is the place where we collect and refine:

- the core product model
- the main workflows
- the roles in the system
- the major page types
- the important architectural decisions
- the major open questions

This file is meant to grow over time.

## How To Use This Spec

This document is the primary source of truth for the project.

It should be used for:

- product decisions
- page and workflow design
- architecture alignment
- checklist creation
- autonomous implementation planning

Supporting files can explore and elaborate, but this file should hold the settled or active working version of the product.

If another planning file conflicts with this one:

- this file wins
- unless we explicitly decide to update it

## Spec Status Legend

This spec uses three levels of confidence:

- `[Decided]`
- `[Provisional]`
- `[Open]`

Current working rule:

- use `Main Architectural Decisions So Far`, `Page Inventory`, and `Action Inventory` as effectively `[Decided]`
- use the current Aura / Terra / Arca interpretation and subject typing ideas as `[Provisional]`
- use `Current Open Questions` as `[Open]`

As the document matures, more sections should be explicitly marked with status.

## Decision Rules For Codex

These rules define where autonomous work is encouraged and where explicit user approval is still needed.

Codex may proceed autonomously when:

- applying already-decided page grammar
- improving consistency across existing flows
- reusing the canonical action language
- splitting work into focused flows already supported by this spec
- turning agreed ideas into checklists, maps, and design options

Codex should pause and ask before committing when the work would:

- change the user-facing vocabulary significantly
- introduce a new top-level page or major navigation surface
- redefine the meaning of Aura, Terra, or Arca
- change permissions or privacy boundaries
- change how public contribution works
- create destructive migrations or irreversible data changes
- replace an already-agreed flow with a competing one

When several plausible design options exist, Codex should prefer presenting:

1. the recommended option
2. one or two meaningful alternatives

rather than an open-ended brainstorm.

## Current Product Thesis

Tethr is one unified system for giving real-world subjects a persistent identity and a life over time.

The user should feel like they are interacting with:

- this thing
- this place
- this record
- this photo
- this history
- this collection

The user should **not** need to think first in internal system words.

## Product North Star [Decided]

Tagline:

- `Tethr your world`

Meaning:

- collect the things that matter to you
- collect the places you go
- collect the experiences you have
- collect your taste, your memory, and your patterns over time

This is meant to feel:

- personal
- meaningful
- quiet but powerful

It should not feel like:

- filling out a database
- submitting feedback for someone else's benefit
- doing unpaid work for a platform

## Collection-First Engagement Principle [Decided]

The primary emotional loop of Tethr should be:

- I am collecting my world for myself

This means users should feel like they are:

- building their own lists
- keeping track of their own things
- logging their own experiences
- saving their own photos and memories
- learning their own tastes and patterns

Important rule:

- personal value comes first
- shared value comes second

The byproducts may still be extremely valuable:

- owners and stewards can learn from aggregate personal entries
- AI can find patterns across many personal records
- public/shared subjects can become richer over time

But those are downstream effects.
They should not be the primary user-facing pitch.

## UI Language Rules [Decided]

User-facing language should reinforce the feeling of collecting a personal world.

Prefer language like:

- `Save`
- `Add to my list`
- `Log my experience`
- `Add my rating`
- `Add my notes`
- `Keep track`
- `Collect`

Use carefully and contextually:

- `Review`
- `Visited`
- `Watched`
- `Read`
- `Tried`

Avoid default language like:

- `Contribute`
- `Submit feedback`
- `Provide data`
- `Help the community`
- `Enter information for the owner`

Those may be true as system effects, but they should not be the emotional framing of the main experience.

## Steward / Owner Language Rule

Owners and stewards should have a distinct language layer for their own tools.

Examples:

- `Create official page`
- `Curate page`
- `Manage presentation`
- `View insights`
- `Ask custom questions`

This is different from the everyday user language.

The product should not make ordinary users feel like they are participating in owner tooling when they are really just trying to collect their own world.

## Universal Personal Entry Model [Provisional]

Shared subjects should feel consistent to interact with, regardless of domain.

This means the default personal-entry experience for a shared subject should not vary wildly between:

- a whisky
- a movie
- a book
- a restaurant
- a landmark

Domain matters for identity and official stewardship.
But the personal-entry layer should feel broadly universal.

## Core Personal-Entry Rule

When a user interacts with a shared subject for themselves, the base personal-entry model should be:

- `1-5 star rating`
- `comment`
- optional `photo`
- `timestamp`
- `user`

This is the minimum common layer.

It is intentionally simple because:

- the emotional goal is collecting for yourself
- the data is still highly valuable
- AI can evaluate the comments and find patterns later

## Custom Question Overlay Rule

Owners and stewards may add custom prompts or fields on top of the universal personal-entry model.

Examples:

- tasting prompts for a whisky
- reflection prompts for a book
- visit prompts for a landmark
- special questions from a brand or venue owner

Important rule:

- custom fields should be additive
- they should not replace the universal personal-entry layer

The user should always be able to leave a simple personal record without being forced into a large domain-specific form.

## Base Personal Entry Schema [Provisional]

This is the first-version product schema for a shared-subject personal entry.

It is a product-level payload definition.
It does not yet require one dedicated database table if the same behavior is better represented through existing entities.

The key idea is:

- the user experiences one simple personal-entry model
- the underlying persistence may span `UserSubjectRelation`, `Event`, and `MediaAttachment`

## Minimum Entry Requirement

A valid personal entry must include:

- `subject_id`
- `user_id`
- `created_at`
- at least one of:
  - `star_rating`
  - `comment_text`
  - `media_attachment`

This keeps the flow lightweight while ensuring the entry contains some real personal signal.

## First-Version Fields

### Required context fields

- `subject_id`
- `user_id`
- `created_at`
- `visibility`

### Core personal-entry fields

- `star_rating`
- `comment_text`
- `primary_media_attachment_id`

### Optional context fields

- `experienced_at`
- `favorite_flag`
- `relationship_hint`
- `collection_ids`
- `custom_prompt_answers_json`

## Field Meanings

### `subject_id`

The shared subject this personal entry is attached to.

### `user_id`

The user creating the entry.

### `created_at`

When the entry was created in Tethr.

### `experienced_at`

When the experience actually happened, if different from creation time.

### `visibility`

The intended visibility of the personal entry:

- `private`
- `workspace`
- `shared`
- `public`

### `star_rating`

The global `1-5` star rating when the user chooses to give one.

### `comment_text`

The user's own words.

This should remain flexible and should not be over-structured by default.

### `primary_media_attachment_id`

The main attached image if the user includes one.

### `favorite_flag`

Whether the user wants this subject to count as a favorite in their own world.

### `relationship_hint`

An optional helper value that may align with the user's broader relationship state:

- `tried`
- `visited`
- `read`
- `watched`

This should not replace the fuller `UserSubjectRelation` model, but it may help the flow make smart suggestions.

### `collection_ids`

Optional collection memberships applied as part of the same action.

### `custom_prompt_answers_json`

Optional answers to owner/steward prompts layered on top of the universal entry model.

## Mapping Rule

The first-version system may map this product-level personal-entry payload into:

- `UserSubjectRelation`
- `Event`
- `MediaAttachment`
- `CollectionItem`

The product should preserve the feeling of one simple entry even if multiple records are written underneath.

## Important Rule

`Arca`, `Terra`, and `Aura` are useful architecture concepts, but they may remain mostly internal.

The user-facing experience should feel like:

- one subject system
- one design language
- one navigation logic
- one page grammar

with different emphasis depending on the kind of subject.

## Current Internal Interpretation

This is the current working meaning of the three core layers.

### Aura

Aura refers to the broader shared identity of a thing.

Examples:

- `Lagavulin 16`
- a movie title
- a book
- a landmark
- a brand

Aura is where shared or stewarded meaning tends to live:

- canonical description
- tasting notes
- brand or steward curation
- public/shared entries
- presentation
- prompts/questions
- owner-designed display or interaction

### Terra

Terra refers to one specific thing.

Examples:

- one specific bottle of Lagavulin 16
- one specific furnace
- one specific bench
- one specific tool
- one specific sweater if that specific instance matters

Terra is where the subject's own life over time matters:

- maintenance
- repairs
- visits
- usage
- memories
- specific media tied to that instance

### Arca

Arca refers to placement and inventory state.

Arca can refer to:

- one specific thing
- or many of the same thing

Examples:

- 3 gas cans in the garage
- 1 blue sweater in Winter Box
- one bottle on shelf two
- a container in a room

Important current rule:

- quantity belongs only to Arca

## Simpler User-Facing Mental Model

Even if the internal architecture uses Aura / Terra / Arca, the user-facing mental model should be simpler:

### Subject

What this is.

### State

What is true right now.

Examples:

- where it is
- what contains it
- quantity
- current relationship
- current status

### Log

What happened over time.

Examples:

- maintenance
- visits
- ratings
- memories
- usage
- notes
- photos

### Links

How it connects to other subjects.

Examples:

- instance of
- located in
- contains
- related to
- visited by
- depicts

This simpler model may be the better basis for the UI, even if the internal data model is richer.

## Product Layers

### 1. Shared World

The common layer of subjects known by many users.

Examples:

- Lagavulin 16
- a movie
- a book
- a landmark
- a cigar brand
- a stadium

### 2. Personal World

Each user's own relationship to subjects.

Examples:

- tried
- own
- want to try
- visited
- favorite
- reviewed
- photographed
- tracked

### 3. Stewarded World

Some subjects are curated by an owner or steward.

Examples:

- Diageo curating Lagavulin 16
- a museum curating an artifact page
- a park organization curating a place page
- a seller curating a for-sale item

## Canonical Data Entities [Provisional]

This section defines the durable nouns of the system.

These are not UI sections and not page names.
They are the core records the product needs in order to behave cleanly over time.

Guiding rule:

- the UI may feel simple
- the data model should still separate different kinds of truth when that separation reduces confusion

The canonical subject page is composed from these entities.
It is not itself a data entity.

## Entity Design Rules

### Rule 1

Prefer durable nouns over feature-specific tables.

### Rule 2

Do not make page sections into entities unless they represent real persistent records.

### Rule 3

Keep current state separate from historical events.

### Rule 4

Keep personal relationship separate from physical holding, even if the UI presents them close together.

### Rule 5

A shared rating should be derived later from personal ratings, not stored as the primary source of truth on the subject itself.

## First-Pass Canonical Entities

## Common Field Conventions

These are recurring field patterns, not mandatory columns on every entity.

Commonly useful fields:

- `id`
- `created_at`
- `updated_at`
- `workspace_id` when the record belongs to a workspace
- `visibility` when the record may be private, shared, or public
- `metadata_json` only when the information truly does not deserve a first-class field yet

Guiding rule:

- prefer explicit fields for stable, important concepts
- use JSON only for shape-flexible or still-evolving detail

### 1. User

Represents:

- a person using Tethr

Purpose:

- own data
- create entries
- create collections
- relate to subjects
- receive reminders

Likely fields:

- `id`
- `external_auth_id`
- `display_name`
- `email`
- `avatar_media_asset_id`
- `created_at`
- `updated_at`

### 2. Workspace

Represents:

- the scope in which state and organization live

Examples:

- personal workspace
- household workspace
- shared family workspace
- organizational workspace

Purpose:

- boundary for records
- permissions anchor
- organizational scope

Likely fields:

- `id`
- `name`
- `slug`
- `workspace_type`
- `owner_user_id`
- `default_visibility`
- `created_at`
- `updated_at`

### 3. Subject

Represents:

- the core identity record

A subject may be:

- a shared subject
- a tracked instance
- a stored inventory subject
- a place
- a container
- a person
- a destination
- a work

Examples:

- Lagavulin 16
- one specific bottle
- Basement Furnace
- Blue Wool Sweater
- North Trail Bench

Purpose:

- hold identity
- hold stable descriptive details
- act as the anchor for state, links, media, and events

Likely fields:

- `id`
- `subject_scope`
- `workspace_id`
- `subject_kind`
- `title`
- `subtitle`
- `description`
- `status`
- `visibility`
- `created_by_user_id`
- `hero_media_attachment_id`
- `created_at`
- `updated_at`

Notes:

- `subject_scope` may distinguish between shared/global subjects and workspace-scoped subjects
- this is one of the biggest fields areas still likely to evolve

### 4. SubjectLink

Represents:

- a typed relationship between two subjects

Examples:

- instance_of
- located_in
- contains
- related_to
- owned_by
- stewarded_by
- depicts

Purpose:

- connect subjects without flattening everything into one record

Likely fields:

- `id`
- `workspace_id`
- `from_subject_id`
- `link_type`
- `to_subject_id`
- `start_at`
- `end_at`
- `sort_order`
- `metadata_json`
- `created_at`

### 5. Holding

Represents:

- current physical or inventory state

Examples:

- sweater in Winter Box
- bottle on shelf two
- three gas cans in the garage

Purpose:

- current place
- current container
- quantity
- current condition
- current availability

Important rule:

- quantity belongs here

Likely fields:

- `id`
- `workspace_id`
- `subject_id`
- `location_subject_id`
- `container_subject_id`
- `quantity`
- `condition_label`
- `availability_status`
- `position_note`
- `updated_at`

### 6. UserSubjectRelation

Represents:

- how a specific user currently relates to a subject

Examples:

- own
- tried
- want_to_try
- visited
- favorite
- reviewed

Purpose:

- store personal relationship state that is not the same as physical placement

Important note:

- a user can want to try a whisky without physically holding it
- a user can favorite a place without owning or containing anything

Likely fields:

- `id`
- `user_id`
- `subject_id`
- `workspace_id`
- `relation_type`
- `current_star_rating`
- `note_summary`
- `is_favorite`
- `visibility`
- `updated_at`

### 7. Event

Represents:

- something that happened over time

Examples:

- serviced
- repaired
- drank
- visited
- photographed
- reviewed
- installed
- moved

Purpose:

- create the log / timeline layer

Likely fields:

- `id`
- `workspace_id`
- `subject_id`
- `template_id`
- `event_type`
- `title`
- `summary`
- `occurred_at`
- `recorded_at`
- `actor_user_id`
- `actor_subject_id`
- `place_subject_id`
- `star_rating`
- `visibility`
- `metadata_json`

### 8. Template

Represents:

- a reusable structure for events or log entries

Examples:

- furnace maintenance template
- tasting notes template
- visit template

Purpose:

- support structured logging
- avoid reinventing entry fields for repeated workflows

Likely fields:

- `id`
- `workspace_id`
- `owner_user_id`
- `name`
- `template_type`
- `applies_to_subject_kind`
- `field_schema_json`
- `visibility`
- `created_at`
- `updated_at`

### 9. MediaAsset

Represents:

- an uploaded media file

Examples:

- photo
- image
- future video or audio if supported later

Purpose:

- be the durable media object

Likely fields:

- `id`
- `workspace_id`
- `owner_user_id`
- `storage_provider`
- `storage_path`
- `mime_type`
- `byte_size`
- `width`
- `height`
- `duration_seconds`
- `sha256`
- `created_at`

### 10. MediaAttachment

Represents:

- where a media asset belongs

Examples:

- attached to a subject
- attached to an event
- attached as a hero image
- attached to a public contribution

Purpose:

- allow the same media system to support multiple contexts without overloading Subject or Event directly

Likely fields:

- `id`
- `media_asset_id`
- `attached_to_type`
- `attached_to_id`
- `attachment_role`
- `caption`
- `sort_order`
- `created_at`

### 11. Collection

Represents:

- a user-defined grouping of subjects

Examples:

- My Whiskies
- Want To Try
- Winter Clothing
- Favorite Movies

Purpose:

- support organization
- support reflection
- support later analysis

Likely fields:

- `id`
- `workspace_id`
- `owner_user_id`
- `title`
- `description`
- `collection_type`
- `visibility`
- `created_at`
- `updated_at`

### 12. CollectionItem

Represents:

- the membership of a subject in a collection

Purpose:

- keep collection membership explicit and queryable

Likely fields:

- `id`
- `collection_id`
- `subject_id`
- `sort_order`
- `note`
- `added_at`

### 13. TagBinding

Represents:

- a QR or NFC binding to a subject or flow

Purpose:

- physical-world entry
- scan-to-open
- scan move
- fast mobile handoff

Likely fields:

- `id`
- `workspace_id`
- `binding_type`
- `token_value`
- `target_type`
- `target_id`
- `action_hint`
- `is_active`
- `created_at`
- `updated_at`

### 14. Reminder

Represents:

- a scheduled future action or notification

Examples:

- filter due in 6 months
- annual checkup
- recurring maintenance prompt

Purpose:

- notification and recurrence layer

Likely fields:

- `id`
- `workspace_id`
- `subject_id`
- `owner_user_id`
- `title`
- `reminder_type`
- `due_at`
- `recurrence_rule`
- `status`
- `note`
- `created_at`
- `updated_at`

### 15. SubjectPresentation

Represents:

- the stewarded / curated presentation layer for a subject

Status:

- likely later
- not required for the earliest clean model

Examples:

- curated hero content
- deep-dive details
- custom prompts
- owner-specific display modules

Purpose:

- support Aura-heavy presentation without overloading the base Subject record too early

Likely fields:

- `id`
- `subject_id`
- `workspace_id`
- `steward_user_id`
- `title_override`
- `hero_media_attachment_id`
- `story_rich_text`
- `prompt_config_json`
- `module_config_json`
- `status`
- `updated_at`

## Global Rating Rule [Decided]

Tethr should use one universal rating standard:

- 1 to 5 stars

This should be:

- simple
- personal by default
- reusable across categories

Examples:

- whisky
- book
- movie
- place
- restaurant experience

## Where Rating Lives

### Current rating

The user's current rating of a subject should live on:

- `UserSubjectRelation`

Suggested field:

- `current_star_rating`

This answers:

- "How do I rate this right now?"

### Historical rating

A rating given in a specific moment or context should live on:

- `Event`

Suggested field:

- `star_rating`

This answers:

- "What did I rate this on this occasion?"

Examples:

- a first tasting
- a later revisit
- a movie watched again years later
- a specific restaurant visit

### Shared rating

If the product later shows an overall public/shared rating for a subject, that should be:

- derived from user ratings
- not the primary canonical source of truth on `Subject`

## Why Holding And UserSubjectRelation Stay Separate

These two can appear close together in the UI, but they should stay distinct in the data model.

### Holding answers:

- where is it
- how many are there
- what contains it
- what is its current physical state

### UserSubjectRelation answers:

- do I own it
- have I tried it
- do I want to try it
- is it a favorite
- how do I rate it

Keeping them separate makes these cases clean:

- I want to try Lagavulin 16 but do not own a bottle
- I own a furnace and have reminders on it
- I have quantity 3 gas cans in the garage
- I visited a park bench and rated the experience, but I do not hold it

## How The Subject Page Composes From Entities

The canonical subject page is assembled from:

- `Subject`
- `Holding` when relevant
- `UserSubjectRelation` when relevant
- `Event` list
- `MediaAsset` and `MediaAttachment`
- `Collection` and `CollectionItem`
- `SubjectLink`
- optionally `Reminder`
- later, optionally `SubjectPresentation`

This is why the subject page can stay visually stable while still supporting very different kinds of subjects.

## Example Mappings

### Lagavulin 16

- `Subject`: Lagavulin 16
- `UserSubjectRelation`: want_to_try, current_star_rating
- `CollectionItem`: Peated Whiskies
- `Holding`: possibly none yet
- `Event`: tasted with friends
- `MediaAttachment`: tasting photo
- `SubjectLink`: bottle instance_of Lagavulin 16

### Basement Furnace

- `Subject`: Basement Furnace
- `Holding`: current location and current condition
- `Reminder`: filter due
- `Event`: serviced, repaired
- `MediaAttachment`: repair photos

### Blue Wool Sweater

- `Subject`: Blue Wool Sweater
- `Holding`: Winter Box, guest room closet, quantity 1
- `Event`: optional, possibly minimal
- `MediaAttachment`: current photo

## Notes

This entity model is a first-pass architecture model, not a final database schema.

The next step after this section should be:

- define likely fields for each entity
- define which entities are required in the first implementation
- define which entities can wait

## Entity Build Priority [Provisional]

This section defines which canonical entities are required for the first real unified implementation, which should come next, and which can wait until the system proves its shape.

Guiding rule:

- the first implementation should be structurally clean
- but it should not try to support every long-term capability on day one

## MVP Required

These entities are the minimum set needed for the first real unified version of Tethr to feel coherent.

### `User`

Required because:

- personal data, authorship, ownership of collections, and reminders all depend on a real user anchor

### `Workspace`

Required because:

- Tethr needs a scope boundary for personal, household, family, or organizational data

### `Subject`

Required because:

- this is the core identity record of the entire system

### `SubjectLink`

Required because:

- even the first clean version needs to express relationships like `instance_of`, `contains`, `located_in`, and other cross-subject context

### `Holding`

Required because:

- current place, container, quantity, and current physical state are core to the system

### `UserSubjectRelation`

Required because:

- personal relationships like `own`, `tried`, `want_to_try`, `visited`, and current star rating are central to the product

### `Event`

Required because:

- the system needs a real log / timeline layer from the start

### `MediaAsset`

Required because:

- subjects and events both need durable media support

### `MediaAttachment`

Required because:

- media must attach flexibly to subjects, events, and hero-image contexts without special-casing everything

### `Collection`

Required because:

- personal organization is a core promise of the product, not a later bonus

### `CollectionItem`

Required because:

- collection membership must be explicit if collections are going to be queryable and analyzable

### `TagBinding`

Required because:

- scan and tap entry points are already fundamental to the Tethr interaction model

## Phase 2

These entities should come after the MVP entity layer is stable.

### `Template`

Phase 2 because:

- structured logbook templates are very valuable, but the system can begin with simpler event creation first

### `Reminder`

Phase 2 because:

- reminders are important, especially for maintenance-heavy subjects, but the rest of the subject/state/log system should solidify first

## Later

These entities should wait until the core model is proven.

### `SubjectPresentation`

Later because:

- stewarded presentation is important, but it is a layer on top of the subject system rather than the initial backbone
- introducing it too early risks mixing presentation concerns into the identity model before the base system is stable

## Why This Priority Order Makes Sense

The MVP set supports:

- shared subjects
- tracked instances
- stored inventory
- places
- media
- collections
- personal relationships
- histories
- scan-based entry

without yet forcing us to solve:

- custom structured templates at full depth
- reminder systems at full depth
- stewarded presentation modules at full depth

That keeps the first implementation broad enough to feel like real Tethr, but not so broad that it becomes architecture sprawl before the core product proves itself.

## Controlled Vocabularies [Provisional]

This section defines the current working controlled vocabularies for the first-pass canonical model.

These vocabularies should stay:

- small
- behaviorally meaningful
- stable enough to build against

Guiding rule:

- use controlled vocabularies for concepts that drive behavior
- do not try to encode the whole world as enum values

## Vocabulary Design Rules

### Rule 1

`subject_kind` should drive product behavior, not act as the full content taxonomy.

Examples:

- `shared_subject` is useful as a behavior-driving kind
- `whisky` is better treated as a category or tag later, not a top-level subject kind

### Rule 2

`relation_type` should represent the user's current primary relationship, while things like favorite state and star rating remain separate fields.

### Rule 3

`link_type` should prefer directional, unambiguous relationships.

Examples:

- use `contains`
- use `located_in`
- avoid storing both directions as separate primary types unless needed later

### Rule 4

`event_type` should represent important classes of moments, not every possible sentence a user might write.

### Rule 5

New values should be added sparingly.

If a new value does not clearly change product behavior, it may belong in tags, metadata, or free text instead.

## subject_kind

Purpose:

- define the behavioral kind of subject the UI and workflows are dealing with

Current working values:

- `shared_subject`
- `tracked_instance`
- `stored_inventory`
- `place`
- `container`
- `person`

Interpretation:

### `shared_subject`

Use for:

- broadly shared identities
- products
- brands
- books
- movies
- destinations
- other common-reference subjects

Examples:

- Lagavulin 16
- The Godfather
- Yellowstone National Park

### `tracked_instance`

Use for:

- one specific physical thing whose own life matters

Examples:

- one furnace
- one bottle
- one tool
- one instrument

### `stored_inventory`

Use for:

- things primarily managed by place, quantity, and retrieval

Examples:

- sweater
- socks
- gas cans

### `place`

Use for:

- physical places that can be visited, photographed, or recorded

Examples:

- park bench
- landmark
- room
- overlook

### `container`

Use for:

- things that hold other things

Examples:

- bin
- shelf
- drawer
- storage box

### `person`

Use for:

- people who need to be represented as subjects in links, events, or shared records

Notes:

- if later needed, more subject kinds can be added, but the first version should stay small

## Subject Typing Rules [Provisional]

This section defines how to decide which `subject_kind` a new record should use.

This is important because:

- the same real-world thing can sometimes be viewed in different ways
- the system needs a repeatable rule for choosing the dominant behavior
- subject kinds should reflect the product workflow, not just philosophical ontology

## Core Typing Principle

Choose the subject kind based on:

- the primary way the user will interact with the record

Not just:

- what the thing is "in theory"

Example:

- a park bench could be treated as a place if the main use is visiting and contributing photos
- the same bench could be treated as a tracked instance if the main use is maintenance and repair history

The system should choose the subject kind that best supports the dominant workflow.

## Default Typing Priority

When deciding subject kind, use this order:

1. `place`
2. `container`
3. `shared_subject`
4. `tracked_instance`
5. `stored_inventory`
6. `person`

This is not a philosophical ranking.
It is a conflict-resolution rule for product behavior.

## Typing Decision Rules

### Use `place` when:

- people primarily go there
- it is treated as a location in the world
- visits, photos, notes, or public contribution matter
- the subject acts as a spatial anchor for other things

Examples:

- room
- park bench used as a visitable public record
- overlook
- stadium
- landmark

Questions that suggest `place`:

- "Have I been there?"
- "What happened there?"
- "Can people contribute photos from there?"
- "What is located there?"

### Use `container` when:

- the subject's main role is holding or organizing other subjects

Examples:

- shelf
- drawer
- storage box
- liquor cabinet
- winter bin

Questions that suggest `container`:

- "What is inside it?"
- "What does it contain?"
- "What is stored in this?"

### Use `shared_subject` when:

- the subject is mainly a shared identity, concept, product, work, or publicly recognizable thing
- multiple users may have their own relationship to it
- the subject is not one specific owned physical instance

Examples:

- Lagavulin 16
- a movie title
- a book title
- a cigar brand
- a destination as a shared concept

Questions that suggest `shared_subject`:

- "What is this known for?"
- "Have I tried this?"
- "Do I want to try this?"
- "What do people think of this?"

### Use `tracked_instance` when:

- the record is about one specific physical thing
- that specific thing has its own history
- the timeline matters more than quantity

Examples:

- one furnace
- one bottle
- one tool
- one instrument
- one appliance

Questions that suggest `tracked_instance`:

- "What happened to this exact thing?"
- "When was it serviced?"
- "What is due next?"
- "What photos or memories belong to this instance?"

### Use `stored_inventory` when:

- the record is mostly about current place, count, and retrieval
- the thing is fungible or replaceable enough that a unique object history is usually not the main point

Examples:

- sweater
- socks
- gas cans
- canned goods
- seasonal decorations

Questions that suggest `stored_inventory`:

- "Where is it?"
- "How many do I have?"
- "What box is it in?"
- "Can I find it quickly?"

### Use `person` when:

- the subject is a person who needs to appear in events, relationships, ownership, or stewardship

Examples:

- friend in an event log
- steward of a shared subject
- family member in a place or memory history

## Ambiguous Cases

### A bench

Use `place` when:

- it is treated as a destination, memory point, or public contribution anchor

Use `tracked_instance` when:

- it is treated as a physical object with maintenance history

### A bottle of whisky

Use `shared_subject` for:

- Lagavulin 16 as the shared identity

Use `tracked_instance` for:

- one specific bottle whose life matters

Use `stored_inventory` for:

- counted bottles on a shelf when the specific bottle identity does not matter

### Clothing

Use `stored_inventory` when:

- the goal is storage and retrieval

Use `tracked_instance` only when:

- the specific item has its own meaningful story, timeline, or identity

### A room

Use `place` when:

- the subject is experienced as a location

Use `container` only when:

- the main interaction is containment and organization rather than visitation or place identity

## Dual-Layer Rule

Some real-world things can legitimately exist at more than one layer.

Example:

- `Lagavulin 16` as a `shared_subject`
- one owned bottle as a `tracked_instance`
- a counted shelf record as `stored_inventory`

This is allowed when the layers serve different workflows.

But the system should avoid creating multiple subject records for the same real-world thing unless that distinction actually matters.

## Default Rule For Creation

When creating a subject and the type is uncertain:

1. choose the simplest subject kind that supports the user's immediate workflow
2. do not over-model the subject
3. prefer upgrading later rather than forcing complexity immediately

Examples:

- if the user just wants to know where the sweater is, use `stored_inventory`
- if the user just wants to track furnace service, use `tracked_instance`
- if the user wants to rate and review Lagavulin 16 generally, use `shared_subject`

## Current Working Boundary

The current intended boundary is:

- `shared_subject` = shared identity
- `tracked_instance` = one specific thing with its own life
- `stored_inventory` = place/count/retrieval record
- `place` = visitable or locational subject
- `container` = holder/organizer
- `person` = person-as-subject

This boundary is good enough to build against for now, even if later refinements are still possible.

## Relationship Model Between Subject Types [Provisional]

This section defines how the major subject kinds are expected to connect to each other.

The goal is to keep the graph disciplined and to avoid storing the same fact in multiple layers.

## Core Relationship Rule

Use:

- `SubjectLink` for durable identity and semantic relationships
- `Holding` for current physical placement and quantity
- `UserSubjectRelation` for user-specific relationship state
- `Event` for time-bound or moment-specific connections

Guiding rule:

- the same fact should have one primary home

## Relationship Design Rules

### Rule 1

Do not use `SubjectLink` to represent current mutable placement when `Holding` already expresses that truth.

Example:

- use `Holding` for "the sweater is currently in Winter Box"
- do not duplicate that as a primary `located_in` link unless there is a separate durable semantic reason

### Rule 2

Use `SubjectLink` when the relationship is durable enough that it should still make sense outside the current moment.

Examples:

- a bottle `instance_of` Lagavulin 16
- a room `located_in` a house
- a shared subject `stewarded_by` a person or organization subject

### Rule 3

Use `UserSubjectRelation` for personal facts, even when the words sound similar to graph links.

Examples:

- "I own this"
- "I tried this"
- "I want to visit this"

Use `owned_by` only when the ownership is intended as a subject-level fact visible beyond one user's private relationship layer.

### Rule 4

Use `Event` when the connection is temporal.

Examples:

- drank with friends
- visited on a specific date
- repaired by a technician
- photographed during a trip

### Rule 5

Prefer one strong typed relationship over a vague generic one.

Use `related_to` only when no better current link type exists.

## Canonical Relationship Patterns

### Shared Subject

Typical relationships:

- receives `instance_of` from concrete subjects
- may be `stewarded_by` a person or organization subject
- may be `related_to` other shared subjects

Typical examples:

- `Lagavulin 16`
- a movie title
- a book title
- a product or brand

Important note:

- a shared subject is usually not the direct record of current physical placement

### Tracked Instance

Typical relationships:

- may `instance_of` a `shared_subject`
- current place or container belongs in `Holding`
- its life over time belongs in `Event`

Typical examples:

- one bottle
- one furnace
- one instrument
- one bench treated as a specific maintained object

### Stored Inventory

Typical relationships:

- may `instance_of` a `shared_subject`
- current quantity and placement belong in `Holding`
- usually has fewer durable graph links than a `tracked_instance`

Typical examples:

- sweater
- socks
- gas cans
- decorations

### Place

Typical relationships:

- may be `located_in` another `place` for durable spatial nesting
- may receive `Holding` from things currently in that place
- may `instance_of` a `shared_subject` when it is a specific site, branch, or localized example of a broader shared identity
- may be `stewarded_by` a person or organization subject

Typical examples:

- a restaurant location
- a stadium
- a park bench treated as a visitable place
- a room inside a house

### Container

Typical relationships:

- may itself have `Holding` if the container is physically in a place or another container
- should usually express current contents through the held subjects' `Holding` records, not through hard-coded current `contains` links
- may use `contains` only for durable structural composition

Durable composition examples:

- a toolkit that always includes named components
- a box set that conceptually contains multiple works

### Person

Typical relationships:

- may appear in `stewarded_by` or `owned_by` relationships
- often connects through `Event` and `UserSubjectRelation` rather than dense subject-link graphs

Typical examples:

- steward of a shared subject
- author or creator
- person involved in a visit, tasting, or repair event

## Preferred Link Interpretation

### `instance_of`

Use when a more concrete or localized subject should inherit identity from a broader shared subject.

Common patterns:

- `tracked_instance` -> `shared_subject`
- `stored_inventory` -> `shared_subject`
- `place` -> `shared_subject` when the place is a specific branch, venue, or real-world site of a broader shared identity

### `located_in`

Use for durable spatial nesting, not everyday movable inventory state.

Common patterns:

- `place` -> `place`
- sometimes `container` -> `place` when the relationship is effectively fixed rather than just current temporary placement

### `contains`

Use for durable structural composition, not for ordinary current inventory contents.

The UI may still show that a container contains something, but the live source of truth for current contents should usually be `Holding`.

### `owned_by`

Use only when ownership is intended as a canonical subject-level fact.

Do not use this as a substitute for:

- `UserSubjectRelation.own`
- workspace membership
- simple personal possession state

### `stewarded_by`

Use when a subject has an explicit curator, official maintainer, or canonical owner of its public/shared presentation.

### `related_to`

Use as a temporary or weak semantic link only when no stronger type is available yet.

This should be the minority case.

## Example Relationship Patterns

### Lagavulin 16

- `shared_subject`: Lagavulin 16
- `tracked_instance`: specific bottle at the summer house
- `tracked_instance instance_of shared_subject`
- `Holding`: bottle on shelf two in the liquor room
- `UserSubjectRelation`: user wants to try or owns it
- `Event`: opened, tasted, consumed with friends

### Blue Wool Sweater

- `stored_inventory`: Blue Wool Sweater
- optionally `instance_of` a broader shared clothing subject
- `Holding`: quantity 1 in Winter Box
- no durable semantic graph required unless a richer use case emerges

### Basement Furnace

- `tracked_instance`: Basement Furnace
- `Holding`: located in basement utility room
- `Event`: installed, serviced, repaired, inspected
- optional `instance_of` if later tied to a model or product shared subject

### Restaurant

- often `place` with a restaurant-oriented profile
- may be `located_in` neighborhood, city, or venue hierarchy
- may `instance_of` a `shared_subject` if it is one branch of a broader brand or chain identity
- user visits, ratings, photos, and notes should attach through `Event` and `UserSubjectRelation`, not duplicate the subject

## Practical Rule

If you are unsure where a relationship belongs, ask:

1. Is this true right now, or is it durable?
2. Is this personal, or is it part of the shared graph?
3. Is this an event, or is it a standing relationship?

Then choose:

- `Holding` for current physical truth
- `UserSubjectRelation` for personal truth
- `Event` for moment-in-time truth
- `SubjectLink` for durable shared structure

## relation_type

Purpose:

- define the user's current primary relationship to a subject

Current working values:

- `own`
- `tried`
- `want_to_try`
- `visited`
- `want_to_visit`
- `read`
- `want_to_read`
- `watched`
- `want_to_watch`
- `used`
- `tracking`

Notes:

- `favorite` should remain a separate boolean or flag
- `current_star_rating` should remain a separate field
- if a subject needs richer relationship history, that should happen through `Event`, not by endlessly expanding `relation_type`

## link_type

Purpose:

- define typed relationships between subjects

Current working values:

- `instance_of`
- `located_in`
- `contains`
- `related_to`
- `owned_by`
- `stewarded_by`
- `depicts`
- `same_vantage_as`

Interpretation:

### `instance_of`

- a more concrete or localized subject inherits identity from a broader shared subject

### `located_in`

- a subject is durably nested inside a broader place or spatial structure

### `contains`

- a subject durably and structurally includes another subject

### `related_to`

- a generic meaningful relationship when no stronger link type exists yet

### `owned_by`

- a subject has a canonical owner at the subject-graph level, not just a personal relationship state

### `stewarded_by`

- a shared or public-facing subject is curated or managed by a stewarding subject

### `depicts`

- media or representation subject depicts another subject

### `same_vantage_as`

- two place/media contexts share a fixed-angle or coordinated viewpoint

## event_type

Purpose:

- define major classes of moments in the timeline

Current working values:

- `created`
- `purchased`
- `moved`
- `opened`
- `used`
- `consumed`
- `visited`
- `photographed`
- `noted`
- `rated`
- `reviewed`
- `maintained`
- `repaired`
- `inspected`
- `cleaned`
- `installed`
- `removed`
- `sold`

Interpretation:

- `created`
  - first record creation or first meaningful creation moment
- `purchased`
  - acquisition of a thing
- `moved`
  - placement changed
- `opened`
  - a bottle, package, container, or similar object was opened
- `used`
  - general usage when a more specific event type is unnecessary
- `consumed`
  - food, beverage, cigar, or similar experience
- `visited`
  - visit to a place
- `photographed`
  - meaningful photo event
- `noted`
  - text-only or note-heavy entry
- `rated`
  - explicit rating event
- `reviewed`
  - richer qualitative evaluation
- `maintained`
  - routine upkeep
- `repaired`
  - corrective work
- `inspected`
  - check/inspection event
- `cleaned`
  - cleaning or reset event
- `installed`
  - initial placement or installation
- `removed`
  - removal from service or place
- `sold`
  - ownership or availability changed through sale

Notes:

- event titles and summaries should still provide the human language
- `event_type` is for structure, filtering, and behavior

## visibility

Purpose:

- define who can see a record by default

Current working values:

- `private`
- `workspace`
- `shared`
- `public`

Interpretation:

### `private`

- visible only to the user and required system/admin roles

### `workspace`

- visible to authorized users inside the workspace

### `shared`

- visible outside one workspace, but not necessarily open for unrestricted contribution

### `public`

- broadly visible and potentially open to controlled public contribution

## Notes

These vocabularies are intentionally first-pass and conservative.

They should expand only when:

- product behavior clearly demands it
- multiple real use cases are blocked without it
- the new value is not better expressed as a tag, category, or free-text field

## Main User Roles

### Everyday User

Someone trying to:

- save things
- locate things
- move things
- log events
- upload photos
- organize collections
- browse records

### Aura Owner / Steward

Someone who curates a shared subject.

They may:

- shape the page
- define additional prompts/questions
- add special details
- run promotions or events
- extract user-created data
- ask GPT for analysis

### Public Contributor

Someone contributing to a shared subject, especially a public place or public timeline.

They may:

- add a photo
- add a note
- log a visit
- contribute to a time-lapse stream

### AI / GPT Layer

The AI is a system actor that helps users:

- create from images
- move things
- retrieve details
- summarize records
- analyze patterns
- compare collections

### Admin / Moderator

Later role for:

- moderation
- duplicate cleanup
- merge decisions
- abuse prevention

## Permissions Matrix [Provisional]

This section defines the current working permission model for Tethr.

The goal is to answer:

- who can see what
- who can edit what
- who can contribute where
- who can curate shared subjects
- who can moderate public participation

This is a product-level permissions model, not yet a final technical policy model.

## Permission Principles

### Principle 1

Viewing, editing, contributing, and curating are different kinds of permission.

They should not be collapsed into one simple "can access" rule.

### Principle 2

Owning or creating a subject is not automatically the same as stewarding the shared/canonical version of that subject.

### Principle 3

Contributing to a public subject does not grant the right to edit the canonical subject itself.

### Principle 4

The AI / GPT layer acts on behalf of the invoking user.

It does not get extra permissions of its own.

### Principle 5

Users should always be able to edit or delete their own personal contributions unless moderation or preservation rules later override that for public/community reasons.

### Principle 6

Public visibility is not the same as public editability.

### Principle 7

Workspace boundaries matter.

Even a simple first version of Tethr needs to distinguish between:

- private personal records
- workspace-shared records
- public/shared records

## Visibility Levels

Current working levels:

- `private`
- `workspace`
- `shared`
- `public`

Working interpretation:

### Private

Visible only to the user and any system/admin roles with technical access.

### Workspace

Visible to allowed users inside the workspace.

### Shared

Visible to users beyond one workspace, but not necessarily open for public contribution.

### Public

Visible broadly and potentially open to controlled public contribution.

## Role Notes

### Everyday User

Normal user operating inside their own personal or shared workspace context.

### Steward / Aura Owner

A privileged actor for a particular shared subject.
This is subject-specific authority, not blanket authority over the whole system.

### Public Contributor

A user contributing to a public/shared subject without steward rights.

### AI / GPT

Acts only with the permissions of the invoking user.

### Admin / Moderator

System-level authority for moderation, merges, and policy enforcement.

## Permission Matrix

| Action | Everyday user | Steward / Aura owner | Public contributor | AI / GPT | Admin / Moderator |
| --- | --- | --- | --- | --- | --- |
| View own private subject | yes | if also permitted user | no by default | same as invoking user | yes |
| View workspace-shared subject | yes if workspace member | yes if workspace member | no by default | same as invoking user | yes |
| View shared/public subject | yes | yes | yes | same as invoking user | yes |
| Create personal subject | yes | yes | yes if authenticated and allowed | same as invoking user | yes |
| Edit own subject | yes | yes for subjects they own | no by default | same as invoking user | yes |
| Delete own subject | yes | yes for owned subjects | no by default | same as invoking user | yes |
| Add personal event / note / photo to own subject | yes | yes | no by default | same as invoking user | yes |
| Edit own event / note / photo | yes | yes | yes for their own public contributions | same as invoking user | yes |
| Delete own event / note / photo | yes | yes | yes for their own public contributions | same as invoking user | yes |
| Add subject to own collection | yes | yes | yes | same as invoking user | yes |
| Set personal relationship | yes | yes | yes | same as invoking user | yes |
| Contribute to a public/shared subject timeline | if allowed by subject policy | yes | if allowed by subject policy | same as invoking user | yes |
| Edit canonical shared subject details | no by default | yes for subjects they steward | no | no beyond invoking user rights | yes |
| Curate shared subject presentation | no by default | yes for subjects they steward | no | no beyond invoking user rights | yes |
| Export own data | yes | yes | yes | same as invoking user | yes |
| Export contributed data for stewarded subject | no by default | yes for subjects they steward | no | no beyond invoking user rights | yes |
| Moderate public entries | no | not by default unless also moderator | no | no | yes |
| Merge duplicates / canonicalize subjects | no | not by default | no | no | yes |
| Assign / reassign QR or NFC bindings | yes for owned/workspace subjects if allowed | yes for stewarded subjects if allowed | no by default | same as invoking user | yes |

## Practical Permission Rules By Content Type

### Subject core record

Who edits it:

- the creating/owning user for personal/workspace subjects
- the steward for stewarded shared subjects
- admins/moderators if needed

### Personal relationship

Who edits it:

- the individual user only

Examples:

- own
- tried
- want to try
- visited
- favorite
- current star rating

### Holding / current physical state

Who edits it:

- the user or workspace members with authority over that subject

Examples:

- current place
- current container
- quantity
- condition

### Event / personal entry

Who edits it:

- the author by default
- moderators/admins when policy requires

### Shared/public contribution

Who edits it:

- the author of the contribution by default
- moderators/admins when policy requires
- not ordinary viewers

### Stewarded presentation

Who edits it:

- the steward / Aura owner
- admins/moderators if necessary

## GPT Permission Rule [Decided]

The AI / GPT layer does not have independent authority.

It always acts as:

- the current user
- through the permissions that user already has

This means:

- GPT can help create, move, add, summarize, and analyze
- but only within the boundaries the invoking user already has

## Open Permission Questions

These permission questions are not fully settled yet:

### 1. Public contribution without account

Will unauthenticated public contribution ever be allowed, or must all contributions come from identified users?

### 2. Workspace role depth

Do we need explicit workspace roles such as:

- owner
- editor
- viewer

in the first implementation?

### 3. Steward appointment

How is stewardship assigned, verified, or transferred for shared subjects?

### 4. Public contribution moderation style

Will public contribution be:

- immediate
- moderated
- rate-limited
- reputation-based

### 5. Deletion vs archival

For public/shared entries, when does delete mean real deletion versus soft removal or archival?

## Scan-First Contribution Principle [Decided]

This section defines the current rule for how QR and NFC interactions should behave when they point at an existing Tethr subject.

Core idea:

- a QR code or NFC tag should act as a canonical identity anchor for the subject it represents
- scanning or tapping an existing bound subject should open that subject page
- from there, the user should contribute to that subject rather than create a duplicate

This rule applies whether the subject is:

- a place
- a container
- an item
- a shared brand or product
- a book
- a movie
- a landmark

### Principle 1

If a subject already exists and has a `TagBinding`, scanning or tapping should resolve to that existing subject.

### Principle 2

The default scan result for an existing subject should be:

- open subject page
- show the current identity and context of the subject
- offer the most likely contribution actions

It should not default to a generic create form.

### Principle 3

`Create subject` and `Contribute to subject` are different canonical flows.

They should not be treated as the same action.

### Create Subject

Use this flow when:

- the subject does not exist yet
- no matching subject can be found confidently
- the user explicitly intends to create a new subject
- a new physical instance or inventory record is genuinely required

### Contribute To Subject

Use this flow when:

- a QR or NFC scan resolves to an existing subject
- a user finds an existing subject through search and wants to add their own experience or record
- a shared/public subject already exists and the user is adding a personal entry

Contribution should create or update one or more of:

- `Event`
- `UserSubjectRelation`
- `MediaAttachment`

It should not create a new duplicate `Subject` unless the user explicitly breaks out into a real creation flow.

### Contribution-Oriented Subject Page

When a subject is opened via scan or tap, the page should bias toward view + contribute rather than admin editing.

Likely primary actions include:

- `Add your entry`
- `Add your photo`
- `Log your visit`
- `Add your notes`
- `Add rating`

Administrative edit actions may still exist for authorized users, but they should not dominate the scanned experience.

### TagBinding Rule

`TagBinding` should point to canonical subject identity, not to a transient screen or one-off task flow.

This means:

- the tag should resolve to the subject
- the subject page should decide which actions are relevant
- focused action screens should launch from that subject page as needed

### Implications

- QR and NFC become strong duplicate-reduction tools
- public/shared participation becomes easier because the identity is already anchored
- the subject page needs a contribution-friendly mode
- creation flows should generally search first before creating shared subjects

### Relationship To GPT And Web Creation

This principle does not eliminate creation flows.

It clarifies the rule:

- if identity is already anchored, contribute
- if identity is not yet anchored, create carefully

This means GPT and web creation flows should both prefer:

1. find existing subject
2. attach to existing subject if found
3. create only when no confident match exists

This is especially important for shared/public subjects such as restaurants, landmarks, books, movies, and brands.

## Main Product Surfaces

These are the current core surfaces we believe the system needs.

### Home

The iconic front page and soft dashboard.

## Iconic Home Page Principle [Provisional]

The home page should feel singular, iconic, and calm.

The intended first impression is:

- one big statement
- one primary field
- one obvious beginning

Current direction:

- large `Tethr your world.` headline
- one central input
- minimal supporting chrome
- results appear only after interaction

Important rule:

- do not clutter the home page with dashboard noise before the user starts

The home page should feel more like:

- a personal gateway into your world

and less like:

- a busy admin dashboard
- a crowded productivity app
- a generic search engine clone

## Home Page Shell Direction [Provisional]

The first-version home shell should be designed around two primary moments:

### Idle state

- large `Tethr your world.` headline
- one centered primary input
- no dashboard clutter
- no competing modules above the fold

### Typing state

- the same shell remains in place
- the input remains the dominant interactive element
- the page should still feel calm and uncluttered
- full search results should not take over the home page

Guiding rule:

- the page should feel almost empty until the user begins
- then it should hand the user off into the system rather than turning into a crowded results surface

## Home Search Submission Rule [Decided]

The home page search should submit into a dedicated results page.

Core rule:

- the iconic home page stays calm
- the full mixed-type result set belongs on a separate results page
- the user should be able to submit search with:
  - keyboard `Enter`
  - an explicit search / submit button

Optional rule:

- the home page may later offer lightweight suggestions or recent hints
- but it should not become a full live results page

Important distinction:

- Tethr may use a Google-like interaction model here
- but it should not feel like a generic search-engine clone visually

The results page should be responsible for:

- full mixed-type result rendering
- filters
- sort controls
- richer context per result

## Results Page Shell Direction [Provisional]

The dedicated results page should feel like a natural continuation of the home page rather than a different product.

Preferred first-version pattern:

- the search field remains prominent near the top
- the query is editable in place
- the result count is visible
- mixed-type results render in one stable card grammar
- filters appear only after results are loaded
- sort controls stay secondary to recognition and opening

Important rule:

- the results page may be denser than the home page
- but it should still feel quiet, readable, and unmistakably Tethr

## Minimal Account Access Rule [Provisional]

The home page should include a quiet account access point for signed-in state and personal navigation.

This control should:

- indicate whether the user is signed in
- give access to the user's lists
- give access to settings and personal account surfaces

But it should do so without becoming a full top navigation bar.

Preferred first-version pattern:

- one restrained control in the top-right
- a small menu or sheet for:
  - `My lists`
  - `Recent`
  - `Settings`
  - sign-in or sign-out state

Important rule:

- this utility control should support the user's personal world
- it should not visually compete with the headline and main search field

### Universal Search And Command

The fastest search and action entry point.

## Universal Front-Page Search Principle [Decided]

The front page search should behave as one unified search surface across the whole system.

Core rule:

- if it matches, show it
- the search query begins on the home page and resolves on the dedicated results page

This means search results may include:

- places
- containers
- stored inventory
- tracked instances
- shared subjects
- people when relevant

The user should not need to decide first which "kind" of thing they are looking for.

## Search Result Rule

Initial results should optimize for:

- broad matching
- fast recognition
- low friction

The system should not prematurely hide results just because they come from different subject kinds.

## Filtering Rule

Filtering should happen after the initial match set, not before.

That means the user may:

1. search for anything
2. see all plausible matches
3. then filter or sort if needed

Examples of later filters:

- places
- containers
- items
- shared subjects
- tracked objects
- recently updated
- nearby

## Presentation Rule

Mixed search results should still feel coherent.

Each result should:

- clearly show what kind of subject it is
- keep a consistent visual grammar
- make the next action obvious

The search system should feel like one Tethr search, not separate searches stitched together.

## Mixed-Type Search Result Card Grammar [Decided]

This section defines the first-version visual grammar for search results when many subject kinds appear together.

The goal is:

- mixed results should feel unified
- different subject kinds should still be immediately understandable
- the user should know what they are looking at in one glance

## Core Card Principle

Every search result card should use the same base shell.

That shell should always answer:

- what is this
- what kind of thing is it
- what matters most right now
- what happens if I open it

The content emphasis may change by subject kind, but the card grammar should stay stable.

## Canonical Card Anatomy

Each search result card should have these layers:

### 1. Type cue

A compact visible cue showing the behavioral kind.

Examples:

- `Place`
- `Container`
- `Item`
- `Tracked`
- `Shared`
- `Person`

This should be readable at a glance, not hidden in metadata.

### 2. Primary identity

The main title of the subject.

Examples:

- `Lagavulin 16`
- `Basement Furnace`
- `Blue Wool Sweater`
- `Winter Box`

### 3. Secondary context

A short line that helps disambiguate the result.

Examples:

- current location
- container
- subtitle
- short description
- chain or brand context
- parent place

### 4. Current-state or relevance strip

One compact line or small cluster showing what matters most for this result type.

Examples:

- `In Winter Box`
- `3 on hand`
- `Visited`
- `Want to try`
- `In Basement Utility Room`
- `Last updated 2 days ago`

### 5. Optional thumbnail

If a strong image exists, the card may show it.

Rule:

- thumbnails should help recognition
- they should not overwhelm the card grammar

### 6. Immediate action expectation

The card should make it obvious that opening it will lead to the subject page.

The search result itself should not try to become a mini dashboard.

## Default Search Priority Rule [Decided]

By default, the search system should prioritize the user's own actionable records before broader shared-subject matches.

In plain terms:

- your own Arca-style records should usually rise first
- your own Terra-style records should usually rise first
- shared subjects should still appear, but they should not bury your own world by default

This means the default search experience should feel like:

- `find my thing first`

and only secondarily like:

- `search the broader shared world`

Important future rule:

- this default ranking preference should later be adjustable in user settings

Preferred later settings examples:

- `Prioritize my records`
- `Balanced`
- `Prioritize shared subjects`

## Default Search Ranking Model [Provisional]

The first-version default search sort should be `Best match`, with personal/actionable relevance weighted ahead of broader shared matches.

### First-version ranking stack

Results should generally rank in this order:

1. exact matches from the user's own actionable world
2. close matches from the user's own actionable world
3. exact matches from shared subjects
4. close matches from shared subjects
5. broader fuzzy or partial matches

### What counts as the user's own actionable world

This should usually include:

- stored inventory
- tracked instances
- containers
- places in the user's workspace
- personal-entry-backed subjects that the user has clearly saved, rated, visited, or collected

### Strong ranking boosts

These should raise a result meaningfully:

- exact title match
- exact scan/tag identity match
- the subject belongs to the current user or current workspace
- the subject has a current holding or actionable state
- the subject was recently opened or updated by the user
- the user has a strong personal relationship to the subject
  - owned
  - favorite
  - want to try
  - visited
  - collected

### Moderate ranking boosts

These should help without overwhelming the core order:

- title prefix match
- strong subtitle/context match
- recent interaction
- matching collection membership
- relevant media that improves recognition

### Lower-priority match behavior

These should still appear, but lower:

- substring-only matches
- weak fuzzy matches
- broad shared-subject matches with no clear personal connection

### Important rule

- ranking should optimize for recognition and actionability before completeness

The user should usually see:

- the thing they can do something with right now

before they see:

- the broader universe of things that happen to match the query

## Search Sort Modes [Provisional]

First-version search should default to:

- `Best match`

Later sort modes may include:

- `Recently updated`
- `Alphabetical`
- `Recently opened`

Important rule:

- sort controls should exist on the results page
- but they should stay secondary to the default `Best match` experience

## Search Filter Behavior [Provisional]

Filters should help the user narrow a mixed result set after search, without forcing category choices before search.

### First-version filter placement

Filters should appear:

- on the dedicated results page
- near the result count and query context
- above the results list

### First-version filter style

The preferred first-version pattern is:

- compact filter chips
- visible immediately after results load
- horizontally scrollable on mobile
- wrapped or inline on larger screens

### First-version top-level filters

The first visible filter set should stay simple.

Recommended starting set:

- `All`
- `Places`
- `Containers`
- `Items`
- `Tracked`
- `Shared`

Additional filters such as:

- `People`
- `Nearby`
- `Recently updated`

should appear only when relevant or later in the product.

### First-version interaction rule

Top-level type filters should act as a simple narrowing control.

Preferred first-version behavior:

- `All` is selected by default
- tapping another chip narrows the visible result set
- only one top-level type filter is active at a time
- changing the filter should not clear the query
- the result count should update immediately

### Important rule

- filtering should feel lightweight and reversible
- it should not feel like entering an advanced search form

### Later filter expansion

Later versions may support richer narrowing such as:

- `Mine only`
- relationship-based filters
- collection filters
- status filters
- location-aware filters

But the first version should stay simple enough that the result page remains calm and readable.

## Type-Specific Emphasis Rules

### Shared Subject

Emphasize:

- title
- category or identity context
- personal overlay if it exists

Good examples:

- `Lagavulin 16`
- `Want to try`
- `4 stars`

### Tracked Instance

Emphasize:

- title
- current place
- current status or next-relevant fact

Good examples:

- `Basement Furnace`
- `In Basement Utility Room`
- `Filter due in 2 months`

### Stored Inventory

Emphasize:

- title
- current container or place
- quantity

Good examples:

- `Blue Wool Sweater`
- `In Winter Box`
- `Qty 1`

### Place

Emphasize:

- place name
- parent context
- personal relationship or recent activity when relevant

Good examples:

- `Barton Springs Pool`
- `Austin, Texas`
- `Visited`

### Container

Emphasize:

- container name
- current parent place
- quick containment clue when useful

Good examples:

- `Winter Box`
- `Guest Room Closet`
- `Contains clothing`

### Person

Emphasize:

- identity
- role or relationship context

Good examples:

- `Chris`
- `Friend in tasting notes`

## Personal Overlay Rule

If the user already has a relationship to the subject, that overlay should be visible in the card when helpful.

Examples:

- `Own`
- `Visited`
- `Read`
- `Watched`
- `Want to try`
- `Favorite`
- `4 stars`

This helps the card feel like part of the user's world, not just a neutral search index.

## Ranking Display Rule

Search results may be mixed-type, but the top-level card language should stay calm and comparable.

Do not use wildly different layouts by type.

Instead:

- same shell
- different emphasis
- clear type cue

## First-Version Layout Guidance

First-version result cards should stay compact and scannable.

Recommended visual hierarchy:

1. type cue
2. title
3. one line of context
4. one line of state or personal overlay

Optional thumbnail:

- left or top, depending on overall search layout

Important rule:

- the first version should not try to show timeline, collections, and rich metadata all inside the result card

## What Search Results Should Not Try To Do

Search result cards should not become:

- mini subject pages
- mini edit forms
- mini timeline views
- over-designed domain-specific widgets

They exist to help the user:

- recognize
- choose
- open

## Practical Examples

### Example: Shared Subject

- `Shared`
- `Lagavulin 16`
- `Single malt whisky`
- `Want to try · 4 stars`

### Example: Tracked Instance

- `Tracked`
- `Basement Furnace`
- `Basement Utility Room`
- `Filter due in 2 months`

### Example: Stored Inventory

- `Item`
- `Blue Wool Sweater`
- `Winter Box`
- `Qty 1`

### Example: Container

- `Container`
- `Winter Box`
- `Guest Room Closet`
- `Contains clothing`

### Example: Place

- `Place`
- `Barton Springs Pool`
- `Austin, Texas`
- `Visited`

### Scan / Quick Capture

The fastest physical-world entry point.

### Subject Page

The canonical page for a subject.

### Collection Page

A grouped view of a user's own world.

### Timeline / Logbook View

A history-first view for a subject.

### Focused Action Screens

Single-job screens such as:

- add photo
- add event
- move
- update count

## Primary User Jobs

The product must support these jobs cleanly.

### Save a new thing quickly

Examples:

- add a sweater to Winter Box
- add a bottle to the liquor room
- save a book to Want To Read

### Find where something is

Examples:

- where is my skiing helmet
- how many gas cans do I have
- which shelf is the bottle on

### Record something that happened

Examples:

- serviced the furnace
- drank a bottle with friends
- visited a bench
- finished a book

### Add or replace media

Examples:

- shelf photo
- repair photo
- event memory photo
- public time-lapse contribution

### Browse a subject deeply

Examples:

- see what it is
- see its photos
- see its history
- see related things
- see personal relationship

### Organize and reflect

Examples:

- whiskies tried
- books loved
- stadiums visited
- favorite movies

### Ask AI for insight

Examples:

- which whiskies do I like most
- what kinds of books do I finish fastest
- which places have I photographed repeatedly

## Arca Workflow Requirements

Current list of actions the user may need:

### Create

- create location
  - name
  - description
  - image
- create container
  - name
  - description
  - image
  - location
- create item
  - name
  - description
  - image
  - initial quantity
  - container

### Edit

- edit location
- edit container
  - including location
- edit item
  - including container
  - including quantity
  - including image

### Delete

- delete location
- delete container
- delete item

### View

- open an attractive details page for any location, container, or item
- scan or tap to open that details page

### Search / Find

- search locations, containers, items
- sort results
- filter results

### Scan / Tag Interaction

- scan QR code to open record
- tap NFC tag to open record

### Scan Move

- scan item then scan container to move item into container
- scan container then scan location to move container into location
- support this through QR or NFC

## Terra Workflow Requirements

### Create

- create a new tracked item
  - name
  - description
  - image
  - important details

### Templates

- choose a logbook template
- create a custom logbook template
- support structured entry fields
- support uploaded images inside entries

### View

- view the item and all of its details
- view the logbook entries in the same overall design language as Arca

### Edit / Delete

- edit item details
- edit item image
- delete item

### Log

- create a new logbook entry
- scan/tap to open the item's page and quickly create a new logbook entry

### Privacy

- change privacy settings of an item

### Scheduled Events

- create scheduled reminders
- show notification when due

Examples:

- furnace filter in 6 months

## Aura Workflow Requirements

### Find Shared Subject

- locate an Aura item
  - brand
  - movie
  - book
  - landmark
  - or anything singular tracked collectively

### Create Personal Entry

Examples:

- tasting notes for food or beverage
- account of your experience at a restaurant
- impressions of a book
- family picture at a stadium
- concert review
- movie rating
- cigar notes

### View Shared / Curated Information

- view curated display created by the owner or steward
- view shared entries from other users

### Edit / Delete Personal Entries

- edit your own previous entry
- delete your own previous entry

### Organize Personal Aura Entries

- view curated lists

Examples:

- books
- cigars
- baseball stadiums visited

## GPT / AI Workflow Requirements

### Current / Near-Term

- upload a photo and ask GPT to add the item to a container
- ask GPT to move a container to another location
- ask GPT to move an item to another container
- ask GPT for evaluations and insights from the user's data

### Longer-Term Potential

This is a very large capability area.

Likely uses:

- preference analysis
- comparative summaries
- collection insights
- prompts for missing data
- suggested relationships
- reminders and pattern detection

## Aura Owner / Steward Requirements

### Curate Subject Page

- curate the shared subject page
- design a customized display page

### Publish Curated Information

Examples:

- deep dive brand or product details
- special details about a place
- expanded presentation of a movie, book, or product

### Ask Special Questions

- gather structured information valuable to the owner
- gather custom data beyond standard entry fields

### Share Offers / Promotions / Events

- show things the owner wants to share with the Tethr community

### Extract Data

- export all user-created responses to standard and custom questions

### AI Analysis

- query GPT for insights on created data

Examples:

- what movies are favorites of people who highly rate Guinness Stout
- of users who have visited 5 or more states, how many have been to Idaho

## Cross-Cutting System Needs

These are not optional. They affect everything.

### Permissions And Privacy

Need rules for:

- who can view
- who can edit
- who can delete
- who can contribute
- who can curate
- what is private
- what is shared
- what is public

### QR / NFC Management

Need not only scanning, but:

- create code/tag
- assign tag
- reassign tag
- disable tag
- replace tag

### Media Management

Need support for:

- upload
- replace
- remove
- reorder
- caption
- subject photos
- event photos
- current/hero image

### Change History / Audit

Separate from Terra log entries, we may need:

- record change history
- who changed what
- when image changed
- when quantity changed
- when location changed

### Collections / Saved Views

Need support for:

- user-created collections
- smart collections later
- saved filters
- pinned views

### Recurrence / Notifications

Need support for:

- one-time reminder
- recurring reminder
- due soon
- overdue
- subject-linked reminder

### Templates / Structured Fields

Especially important for Terra:

- template definitions
- template ownership
- template permissions
- private/shared/official templates

### Duplicates / Merge / Identity

Especially important for shared Aura subjects:

- duplicate detection
- merge flow
- canonical subject assignment

### Export / Portability

Need likely support for:

- export my entries
- export a subject's entries
- export media
- export structured data

### Public Moderation

If shared/public contribution exists, eventually need:

- abuse handling
- reporting
- moderation
- approval or review flows

## Main Architectural Decisions So Far

### Decision 1

The product should feel like one unified subject system, not three separate apps.

### Decision 2

The user may never need to be taught the words:

- Arca
- Terra
- Aura

### Decision 3

The same overall page shell should work for:

- shared subject
- tracked instance
- stored inventory
- public place

with different emphasis rather than different app logic.

### Decision 4

Quantity belongs only to Arca.

### Decision 5

Tiles are previews.
The canonical subject page is the exploded/opened view of the record.

### Decision 6

Focused one-job screens are valid and important when they reduce friction.

Examples:

- upload photo
- add event
- move subject

## Important Example Cases

### Lagavulin 16

Can exist as:

- shared Aura subject
- personal relationship
- specific bottle instance
- inventory record in a place
- source of events and memories

### Furnace

Can exist as:

- specific tracked instance
- place-linked record
- maintenance timeline
- reminder-driven subject

### Sweater / Socks / Gas Cans

Can exist primarily as:

- inventory records
- place/container-linked records
- quantity-aware records

with limited history unless needed.

### Park Bench / Landmark

Can exist as:

- place subject
- public contribution subject
- time-lapse subject
- shared history subject

## Current Open Questions

### 1. User-Facing Vocabulary

How much, if at all, should the terms:

- Arca
- Terra
- Aura

appear in the actual interface?

### 2. Subject Typing Rules

When should something be treated as:

- shared subject
- tracked instance
- stored inventory
- place

### 3. Page Navigation

Will the subject page show everything in one long page, or use local sub-navigation?

### 4. Owner / Steward Controls

How visible should steward-curated content be relative to user content?

### 5. Public Contribution Boundaries

What shared subjects are open to public contribution, and under what moderation model?

## Existing Design / Planning Files

Related architecture and design files currently in the repo:

- [unified-tethr-product-plan.md](/F:/Tethr/TethrArca/docs/unified-tethr-product-plan.md)
- [tethr-user-workflow-map.md](/F:/Tethr/TethrArca/docs/tethr-user-workflow-map.md)
- [tethr-visual-sitemap.md](/F:/Tethr/TethrArca/docs/tethr-visual-sitemap.md)
- [tethr-canonical-subject-page.md](/F:/Tethr/TethrArca/docs/tethr-canonical-subject-page.md)
- [tethr-canonical-subject-page-wireframe.html](/F:/Tethr/TethrArca/docs/tethr-canonical-subject-page-wireframe.html)
- [change-log.md](/F:/Tethr/TethrArca/docs/change-log.md)
- [decision-log.md](/F:/Tethr/TethrArca/docs/decision-log.md)
- [checklists/README.md](/F:/Tethr/TethrArca/docs/checklists/README.md)
- [checklists/phase-1-core-system.md](/F:/Tethr/TethrArca/docs/checklists/phase-1-core-system.md)
- [checklists/core-flows.md](/F:/Tethr/TethrArca/docs/checklists/core-flows.md)

## Page Inventory

This section lists the major pages and surfaces the product is expected to contain.

The purpose of this inventory is to answer:

- what screens actually exist
- what each screen is for
- who mainly uses it
- whether it is a full page, subview, or focused action flow

This should help keep the product unified instead of letting features create accidental new mini-apps.

### 1. Home

Type:

- full page

Primary users:

- everyday user

Purpose:

- orient the user
- resume recent work
- surface reminders
- offer quick entry into search, scan, collections, and recent subjects

Likely contents:

- recent subjects
- recent photos
- due reminders
- quick add entry points
- saved collections

### 2. Universal Search And Command

Type:

- full page
- possibly also an overlay / command palette later

Primary users:

- everyday user
- power user
- GPT-assisted user

Purpose:

- locate any subject quickly
- jump directly to a record
- initiate creation or action from natural language

Likely contents:

- subject search
- place search
- people search
- collection search
- natural-language action input
- filtered result groups

### 3. Scan / Quick Capture

Type:

- focused capture surface

Primary users:

- mobile user
- in-the-moment user

Purpose:

- provide the fastest way to enter the system from the physical world

Likely contents:

- QR scan
- NFC entry
- image-based quick add
- fast note / event entry
- scan move logic

### 4. Subject Page

Type:

- full page

Primary users:

- all users

Purpose:

- serve as the canonical page for a single subject

Likely contents:

- subject identity
- hero media
- primary actions
- current state
- key details
- timeline
- personal relationship
- related subjects

Important note:

- this is the "exploded" view of a tile
- this is the most important page in the entire product

### 5. Collection Page

Type:

- full page

Primary users:

- everyday user
- collector
- reflective / analytical user

Purpose:

- show a curated slice of the user's world

Examples:

- My Whiskies
- Want To Try
- Favorite Movies
- Winter Clothing
- Places I Visited

Likely contents:

- collection header
- filter controls
- sort controls
- tiles
- collection-level analysis hooks later

### 6. Timeline / Logbook View

Type:

- full page or large subview

Primary users:

- user tracking history-rich subjects
- public contributor
- steward

Purpose:

- emphasize what happened over time

Likely contents:

- event stream
- date grouping
- media-backed events
- filters
- add event action

### 7. Media View

Type:

- subview or modal
- possibly full page later for shared/public subjects

Primary users:

- all users

Purpose:

- browse subject media cleanly
- distinguish subject photos from event-specific photos

Likely contents:

- gallery
- hero image selection
- event-linked media
- captions
- contribution / upload entry points

### 8. Focused Photo Upload Screen

Type:

- focused action screen

Primary users:

- mobile user
- GPT-handoff user
- quick-action user

Purpose:

- make adding or replacing a photo extremely easy

Likely contents:

- large upload target
- paste / drag / choose support as appropriate
- crop flow
- save / close

### 9. Focused Add Event Screen

Type:

- focused action screen

Primary users:

- user adding one log entry quickly
- GPT-handoff user later

Purpose:

- record an event without opening a big edit surface

Likely contents:

- event type
- date/time
- note
- optional media
- optional related people/place

### 10. Focused Move Screen

Type:

- focused action screen

Primary users:

- user relocating an item or container
- scan-flow user

Purpose:

- make move operations fast and unambiguous

Likely contents:

- current location/container
- new location/container picker
- confirmation
- optional note

### 11. Edit Details Surface

Type:

- modal, side sheet, or full page depending on context

Primary users:

- everyday user
- steward

Purpose:

- edit structured subject details without overloading the main subject page

Likely contents:

- title
- description
- image management
- type-specific fields
- privacy / visibility where relevant

### 12. Collection Picker / Relationship Picker

Type:

- modal or subflow

Primary users:

- everyday user

Purpose:

- let the user quickly say how a subject fits into their world

Likely contents:

- relationship chips
- collection list
- create new collection

### 13. Steward / Owner Curation Surface

Type:

- privileged full page or management surface

Primary users:

- steward
- Aura owner

Purpose:

- curate shared subject presentation and interaction

Likely contents:

- curated hero content
- deep-dive details
- custom prompts/questions
- special offers/events
- data export hooks

### 14. Notification / Reminder Surface

Type:

- dashboard section or dedicated page later

Primary users:

- user with recurring or due actions

Purpose:

- show scheduled tasks and reminders

Likely contents:

- due soon
- overdue
- one-time reminders
- recurring reminders

### 15. Public Contribution Surface

Type:

- focused action page or public subject subview

Primary users:

- public contributor

Purpose:

- make it easy to add a note, visit, or photo to a shared/public subject

Likely contents:

- contribution type
- image upload
- note
- vantage-point guidance if relevant
- moderation / visibility messaging

### 16. Scan Tag Management Surface

Type:

- settings or management surface

Primary users:

- advanced user
- steward
- admin

Purpose:

- manage QR / NFC bindings and replacements

Likely contents:

- assign tag
- reassign tag
- disable tag
- replace tag

## Page Inventory Notes

Current design principle:

- the product should have a small number of stable full pages
- and a handful of focused one-job flows

We should avoid inventing a new top-level page for every feature.

Instead:

- full pages should hold understanding and navigation
- focused flows should handle fast execution

## Action Inventory

This section defines the major actions in the product.

The purpose of this inventory is to answer:

- what the user is trying to accomplish
- which actions should be primary
- which actions should be contextual
- which actions belong in advanced or privileged surfaces
- where those actions should start and finish

This is not meant to be a giant list of every possible button label.
It is meant to define the stable action system of the product.

## Action Tiers

### Tier 1: Primary Everyday Actions

These are actions that should feel obvious and easy to reach.

They are part of the core daily use of the system.

### Tier 2: Contextual Actions

These matter, but should not always be visible.

They should appear:

- inside a relevant page section
- in an action menu
- or in a focused flow after the user starts a broader task

### Tier 3: Advanced / Privileged Actions

These belong to:

- stewards
- owners
- power users
- admins

They should not dominate everyday subject pages.

## Tier 1: Primary Everyday Actions

### Open subject

Goal:

- understand or act on a specific subject

Applies to:

- all subjects

Starts from:

- tile
- search result
- scan result
- collection
- recent item

Completes in:

- subject page

### Search

Goal:

- find a subject quickly

Applies to:

- all subjects

Starts from:

- Home
- universal search

Completes in:

- search results
- subject page

### Scan / Tap

Goal:

- open a subject from the physical world

Applies to:

- location
- container
- item
- tracked instance
- public place

Starts from:

- scan / quick capture

Completes in:

- subject page
- focused action flow

### Create subject

Goal:

- create a new record

Applies to:

- location
- container
- item
- tracked instance
- shared subject

Starts from:

- Home
- universal search and command
- scan / quick capture
- GPT flow

Completes in:

- subject page
- focused create flow

### Add photo

Goal:

- attach or replace visual media

Applies to:

- most subjects

Starts from:

- subject page
- GPT handoff
- focused photo flow

Completes in:

- focused photo upload screen
- subject page media area

### Add event

Goal:

- record something that happened

Applies to:

- tracked instance
- place
- shared subject where personal entries are allowed
- inventory subject if history matters

Starts from:

- subject page
- timeline view
- focused add-event flow

Completes in:

- timeline / logbook

### Move

Goal:

- change current placement

Applies to:

- item
- container
- tracked instance when location matters

Starts from:

- subject page
- tile action menu
- scan flow

Completes in:

- focused move flow
- updated subject page

### Update quantity

Goal:

- change the current count

Applies to:

- inventory subjects

Starts from:

- subject page
- quick tile control
- focused count flow if needed

Completes in:

- updated current state

### Edit details

Goal:

- change structured information about a subject

Applies to:

- most subjects

Starts from:

- subject page
- action menu

Completes in:

- edit details surface

### Add to collection

Goal:

- organize a subject into a personal grouping

Applies to:

- most subjects

Starts from:

- subject page
- collection picker

Completes in:

- collection membership

### Set personal relationship

Goal:

- say how this subject fits into the user's life

Examples:

- own
- tried
- want to try
- visited
- favorite

Applies to:

- shared subjects
- tracked instances
- places
- media-rich experiences

Starts from:

- subject page
- collection / relationship picker

Completes in:

- updated current state / personal layer

## Tier 2: Contextual Actions

### Filter results

### Sort results

### View full history

### View full media

### Replace image

### Remove image

### Reorder media

### Caption media

### Edit event

### Delete event

### Create collection

### Remove from collection

### Change privacy

### Create reminder

### Edit reminder

### Delete reminder

### Assign QR / NFC tag

### Reassign QR / NFC tag

### Disable QR / NFC tag

### Scan move

Goal:

- perform a move using two scans in sequence

Examples:

- item then container
- container then location

Starts from:

- scan / quick capture

Completes in:

- updated placement state

### Choose logbook template

### Create custom logbook template

### Export personal data

## Tier 3: Advanced / Privileged Actions

### Curate shared subject page

### Edit stewarded details

### Add custom prompts / questions

### Publish offers / promotions / events

### Export contributed data

### Ask GPT for owner insights

### Moderate public entries

### Merge duplicates

### Canonicalize shared subject identity

### Manage public contribution settings

## Action Families

For design purposes, the action system can be grouped into these families:

### Navigation And Discovery

- Open subject
- Search
- Filter
- Sort
- Scan / tap

### Creation

- Create subject
- Create collection
- Create event
- Create reminder
- Create template

### State And Placement

- Move
- Scan move
- Update quantity
- Change location/container
- Set relationship

### Media

- Add photo
- Replace image
- Remove image
- Reorder media
- Caption media

### History And Logging

- Add event
- Edit event
- Delete event
- View full history
- Choose template

### Organization

- Add to collection
- Remove from collection
- Create collection
- Set relationship

### Stewardship / Owner Control

- Curate page
- Add prompts
- publish offers
- export contributed data
- owner analytics

### System Management

- Assign tag
- reassign tag
- disable tag
- merge duplicate
- moderate public entry

## Placement Rules

These rules should keep the action system clean.

### Rule 1

The subject page should show only the highest-value actions for that subject.

### Rule 2

High-frequency actions should be visible without opening an overflow menu.

### Rule 3

Actions that require concentration or structured input should open focused flows.

Examples:

- photo upload
- add event
- move

### Rule 4

Advanced and privileged actions should not crowd the everyday UI.

### Rule 5

The same action names should be reused across the system whenever possible.

Examples:

- Add photo
- Add event
- Move
- Edit details
- Add to collection

## Actions That Should Usually Be On The Subject Page

These are the likely default visible actions:

- Add photo
- Add event
- Move
- Edit details
- Add to collection
- Set personal relationship

Not every subject needs all of them, but this is the core set.

## Actions That Should Usually Open Focused Flows

- Add photo
- Add event
- Move
- Scan move
- quick create from image

## Actions That Should Usually Stay Out Of The Main Surface

- merge duplicate
- assign tag
- reassign tag
- disable tag
- moderation
- data export
- owner-only analytics

## Notes

This action inventory should stay compact and stable.

If a new feature needs a new action, we should ask:

- is this truly a new action
- or is it a variant of an existing action family?

## Build Phases

These phases are not strict release milestones yet.
They are the current recommended build order for turning the spec into a coherent product.

### Phase 1: Core System Shape

Focus:

- unify the product language
- define the stable surfaces
- define the stable action system
- define the canonical subject page

Key outputs:

- master spec structure
- page inventory
- action inventory
- subject page grammar
- workflow maps

### Phase 2: Subject Model And State

Focus:

- define canonical data entities
- define subject typing rules
- define current-state model
- define placement and quantity rules

Key outputs:

- canonical data entities
- relationship model
- state model
- scan/tag model

### Phase 3: Core User Flows

Focus:

- make the highest-frequency flows beautiful and low-friction

Key outputs:

- Quick Add flow
- Add Event flow
- Find / Move / Retrieve flow
- image / media interaction model
- focused action flow rules

### First Implementation Slice: Unified Shell Over Existing Arca

Focus:

- start building the new Tethr interaction model without breaking the current working Arca system
- prove the new `Home -> Results -> Subject View` experience before deeper schema or workflow migration

Why this slice first:

- the current app already has working search, detail surfaces, move flows, photo upload, and focused `/arca` editing
- the biggest immediate product gain is a cleaner shell and navigation model, not a risky backend rewrite
- we can learn from real usage faster if we preserve working creation and edit flows underneath

### Core rule

The first implementation slice should be additive and non-destructive.

That means:

- layer the new shell on top of the current system
- reuse current APIs and working edit flows where possible
- avoid premature schema rewrites
- avoid breaking GPT handoff and focused `/arca` workflows

### What this slice should include

- iconic home page
- dedicated mixed-type results page
- unified subject-view shell for existing personal records
- clear handoff into existing edit/create flows when the new shell does not yet own those actions

### What this slice should explicitly reuse

Current safe foundations already exist for:

- search endpoint
- item detail loading
- container detail loading
- location detail loading
- scan/tag infrastructure
- move flows
- photo upload and crop flows
- focused `/arca` image-first editing

### What this slice should not do yet

- replace the current database model
- rewrite the working item/container/location CRUD flows end to end
- unify every subject type in storage immediately
- deeply change GPT instructions before the new shell is proven
- replace the focused `/arca` flow as the canonical image-first edit path

### Subject-view rule for this slice

The first subject-view shell should focus on the records that already exist cleanly today:

- places
- containers
- personal things/items

Shared-subject depth can follow after the shell is proven.

### UI strategy for this slice

The new shell should be:

- read-heavy first
- action-capable second
- deeply editable only where the current flows are already strong

In practice:

- open the new subject view
- show a calmer, more unified page shell
- link or hand off to current edit flows where needed

### Adapter rule

This slice should use presentation adapters instead of deep rewrites.

That means:

- map current location/container/item records into the new result-card grammar
- map current detail payloads into the new subject-page shell
- keep transformation logic in the UI layer first

### Success criteria

This slice is successful when:

- the home page feels iconic and clear
- the results page feels unified and useful
- opening a result feels like entering one coherent Tethr system
- existing edit/media/move flows still work
- the new shell teaches us where deeper data unification is truly needed instead of guessing

### Phase 4: Terra And Aura Depth

Focus:

- add deeper history, templates, collections, and stewarded/shared layers

Key outputs:

- logbook template model
- event type inventory
- collection model
- relationship model
- owner / steward curation rules

### Phase 5: Public Contribution And Intelligence

Focus:

- public/shared participation
- reminders and notifications
- AI-assisted analysis and action

Key outputs:

- contribution model
- permissions matrix
- moderation model
- reminder model
- AI action model

## Quick Add Flow [Provisional]

This section defines the canonical fast-create flow for Tethr.

The goal of Quick Add is:

- let the user save something quickly
- avoid forcing deep modeling too early
- still protect the system from unnecessary duplicates

Quick Add should feel like one flow with several entry points, not several unrelated creation systems.

## Quick Add Goals

Quick Add should make it easy to:

- save a newly encountered thing
- add something to a place or container
- create a tracked instance
- attach a personal relationship to an existing shared subject
- create a place or container with minimal friction

## Valid Entry Points

Quick Add may start from:

- `Home`
- `Universal Search And Command`
- `Scan / Quick Capture`
- a `Subject Page`
- a `Collection Page`
- GPT-assisted creation

## Core Quick Add Principle

Quick Add should prefer the simplest successful outcome that satisfies the user's immediate goal.

In practice:

1. identify what kind of subject the user is likely dealing with
2. search first when duplication is likely
3. create or attach using the minimum required fields
4. land the user on the created or matched subject page
5. offer one obvious next step when helpful

## Canonical Quick Add Steps

### Step 1: Capture the initial signal

The user may start with:

- text
- image
- scan
- current page context
- explicit type choice

### Step 2: Infer the likely lane

The system should decide whether the user most likely wants to:

- create `stored_inventory`
- create `tracked_instance`
- create `place`
- create `container`
- attach to or create a `shared_subject`

### Step 3: Search first when needed

Search should happen before creation when:

- the subject may already exist as a shared/public subject
- the user is adding a relationship to a known thing rather than creating a private record
- the initial input strongly suggests a canonical identity such as a brand, book, movie, landmark, or restaurant

### Step 4: Collect the minimum required fields

The system should ask for or infer only the minimum needed to save correctly.

### Step 5: Create or attach

Possible outcomes:

- create a new subject
- create a new subject plus `Holding`
- create a new subject plus `UserSubjectRelation`
- attach a new `UserSubjectRelation` to an existing shared subject
- attach a new `Event` or `MediaAttachment` to an existing subject

### Step 6: Land cleanly

The default completion surface should be:

- the resulting subject page

When helpful, the product may immediately offer one focused next step such as:

- `Add photo`
- `Move`
- `Add your entry`
- `Add event`

## Quick Add Lanes

### Lane A: Stored Inventory Quick Add

Typical examples:

- add sweater to Winter Box
- add gas cans to garage shelf
- add bananas to kitchen bin

Minimum required fields:

- title
- parent container or place
- quantity

Default rules:

- quantity defaults to `1`
- if the user supplies a count, respect it
- if no image is supplied, allow creation without blocking

Primary records affected:

- `Subject`
- `Holding`

### Lane B: Tracked Instance Quick Add

Typical examples:

- add Basement Furnace
- add one specific bottle
- add a tool that will have its own history

Minimum required fields:

- title
- current place or container if known

Optional but common:

- image
- description
- first event or note

Primary records affected:

- `Subject`
- optional `Holding`
- optional `Event`

### Lane C: Shared Subject Relationship Quick Add

Typical examples:

- save Lagavulin 16 to Want To Try
- mark a movie as watched
- add a book to Want To Read

Minimum required fields:

- matched existing subject or carefully created new shared subject
- chosen `relation_type`

Optional but common:

- current star rating
- note
- collection membership

Primary records affected:

- `UserSubjectRelation`
- optional `CollectionItem`

Preferred rule:

- if an existing shared subject is found confidently, attach to it rather than create a new one

### Lane D: Place Or Container Quick Add

Typical examples:

- create a new room
- create a new storage box
- create a new shelf

Minimum required fields:

- title
- parent place when relevant

Optional but common:

- image
- description

Primary records affected:

- `Subject`
- optional `Holding` for containers that themselves live in a place

## Minimum Confirmation Rule

Quick Add should not force a heavy review screen for ordinary low-risk creation.

The user should see a confirmation step only when:

- the inferred type is uncertain
- the duplicate risk is meaningful
- the destination container or place is ambiguous
- the subject may already exist as a shared/public identity

Otherwise:

- create directly
- then land on the resulting subject page

## AI Assistance In Quick Add

AI may help with:

- title generation
- description generation
- likely `subject_kind`
- duplicate candidate detection
- suggested `relation_type`
- image-based recognition

AI should not silently:

- create a low-confidence shared/public subject
- guess a destination when several plausible matches exist
- create duplicates when a strong existing match is visible

## Mobile-First Quick Add

On mobile, Quick Add should emphasize:

- camera or photo input
- large tap targets
- minimal required fields
- one obvious confirm action

The user should not need to navigate a large edit form just to save something quickly.

## GPT-Assisted Quick Add

GPT-assisted Quick Add should follow the same backend logic as the web app.

Differences:

- GPT may infer more from natural language and images
- GPT may explain likely matches conversationally
- GPT may create directly when the user's intent is clear

But the same rules still apply:

- find first when shared identity is likely
- ask the smallest clarifying question when ambiguity is real
- create only with the user's permissions

## After-Create Behavior

After Quick Add succeeds, the product should do one of two things:

1. open the resulting subject page
2. open or offer a focused next step closely related to the add

Examples:

- after adding an item from an image, offer photo upload or keep the user on the photo flow
- after adding a furnace, offer `Add first maintenance entry`
- after adding a restaurant visit to an existing place, offer `Add rating` or `Add photo`

## Add Event Flow [Provisional]

This section defines the canonical flow for recording that something happened to or around a subject.

The goal of Add Event is:

- let the user record a meaningful moment quickly
- preserve context without forcing a full edit session
- support both structured and lightweight logging

Add Event should feel like a focused action flow, even when launched from different surfaces.

## Add Event Goals

Add Event should make it easy to record:

- maintenance
- repairs
- visits
- tastings
- readings
- viewings
- usage
- notes
- ratings
- contributed photos

## Valid Entry Points

Add Event may start from:

- a `Subject Page`
- a scanned or tapped subject page
- `Home`
- `Universal Search And Command`
- a reminder or due-soon surface later
- GPT-assisted flows

Preferred rule:

- Add Event should usually begin from an existing subject, not from an empty detached form

## Core Add Event Principle

An event is a time-bound record attached to a subject.

It should answer:

- what happened
- when it happened
- what context matters

It does not need to answer everything about the subject itself.

## Canonical Add Event Steps

### Step 1: Choose or confirm the subject

The subject should usually already be known because the flow starts from:

- a subject page
- a scan result
- a search result

If the subject is not known yet:

- search first
- select subject
- then enter the event flow

### Step 2: Choose the event type

The user may:

- pick a structured event type
- or start from a lightweight note/event entry that the system later classifies more loosely

Common event types include:

- `visited`
- `photographed`
- `maintained`
- `repaired`
- `used`
- `consumed`
- `rated`
- `reviewed`
- `noted`

### Step 3: Capture the minimum event fields

Minimum required fields:

- subject
- event type or event intent
- effective date/time

Common optional fields:

- note
- star rating
- media
- people involved
- place context
- duration
- cost

### Step 4: Apply a template if useful

Templates are optional.

Use them when the event needs repeated structure, such as:

- furnace maintenance
- tasting notes
- restaurant visit
- book review

If no template is needed:

- the event should still be creatable as a simple lightweight record

### Step 5: Attach media if relevant

Media may be:

- the main point of the event
- optional supporting context
- absent entirely

Important rule:

- event media belongs to the event first
- subject hero media is a different concern

### Step 6: Save and land cleanly

The default completion surface should be:

- the subject page with the new event visible in the timeline

When useful, the product may briefly highlight:

- the newly added event
- the new media
- the updated rating or relationship state

## Minimum Event Fields Rule

The user should not be forced through a large structured form just to record a simple event.

The first version should support:

- a lightweight event
- and a structured event

Lightweight event minimum:

- event type
- timestamp
- optional note

Structured event minimum:

- event type
- timestamp
- required template fields for that event domain

## Date And Time Rule

Default:

- event time defaults to now

But the user must be able to change it to:

- a past time
- a specific date
- later, a partial known date if needed

Guiding rule:

- the product should make "this happened now" very fast
- without blocking "this happened earlier"

## Privacy Rule

Event visibility should respect the permissions and visibility model of the subject, while still allowing personal events where appropriate.

Common patterns:

- private personal event on a private subject
- workspace event on a workspace subject
- public contribution event on a public/shared subject

The event flow should make privacy understandable without making every event creation feel like a permissions form.

## Media Attachment Rule

An event may have:

- zero media
- one primary image
- multiple supporting images later

If the user is clearly adding a photo as the event itself:

- create the event
- attach the photo
- then return to the subject timeline

## AI Assistance In Add Event

AI may help with:

- suggesting event type
- generating concise titles or notes
- extracting likely details from an image or prompt
- suggesting a rating prompt or template

AI should not silently:

- invent facts not provided or visible
- upgrade a lightweight event into a more specific one without confidence
- change visibility unexpectedly

## Mobile-First Add Event

On mobile, Add Event should emphasize:

- quick event type selection
- camera/photo-first contribution when relevant
- large inputs
- one obvious save action

The mobile event flow should feel fast enough for:

- standing at a place
- finishing a task
- logging a visit in the moment

## GPT-Assisted Add Event

GPT-assisted Add Event should follow the same event model as the app.

GPT may be better at:

- interpreting intent from natural language
- proposing event type
- drafting notes
- recognizing when the user likely means a subject contribution rather than a new subject

But it should still:

- attach to the existing subject when possible
- use the invoking user's permissions
- ask only when the subject or meaning is genuinely ambiguous

## After-Event Behavior

After Add Event succeeds, the user should land in one of these states:

1. back on the subject page with the new event visible
2. on a focused media follow-up step if the event is primarily about adding media

The product should avoid dropping the user into a generic edit state after event creation.

## Find / Move / Retrieve Flow [Provisional]

This section defines the canonical flow for locating something, understanding where it is, and changing its current placement or count when needed.

The goal of this flow is:

- help the user find the right subject quickly
- show the current location or containment clearly
- make moving or updating count feel fast but trustworthy

This is one of the most important everyday flows in Tethr.

## Core Goals

The user should be able to:

- find a subject from the front page or search
- understand where it is right now
- open the full subject page when needed
- move it to a new place or container
- update quantity when the count changes

## Valid Entry Points

This flow may start from:

- `Home`
- `Universal Search And Command`
- a `Collection Page`
- a `Subject Page`
- a scan result
- GPT-assisted actions

## Search-First Path

This is the default retrieval path.

### Step 1

The user searches for anything using the universal front-page search.

The system should return:

- all plausible matches
- across all subject kinds

### Step 2

The user selects the best match.

The selected result should make it easy to see:

- what the subject is
- what kind of subject it is
- where it is now if that question is relevant

### Step 3

The user lands on the subject page.

From there they can:

- read the current state
- see the holding/location
- decide whether to move it, update count, or do nothing

## Subject-Page Path

This path starts when the user is already on the subject page.

Typical actions:

- inspect current location
- inspect current container
- inspect current quantity
- start `Move`
- start `Update quantity`

Guiding rule:

- the subject page should explain current state clearly
- focused flows should handle the actual edit action

## Scan Path

This path starts from an existing QR or NFC identity anchor.

Behavior:

- scan opens the existing subject page
- the page shows current state immediately
- if the user wants to move the subject, they launch the focused move flow from there

Scan should support retrieval by reducing search friction, not by bypassing subject identity.

## Move Flow

Move should be a focused action flow, not a giant generic edit form.

### Step 1

Confirm the source subject.

### Step 2

Choose the destination:

- place
- container
- sometimes another valid parent context

### Step 3

Preview the resulting state in simple terms.

Examples:

- `Blue Wool Sweater -> Winter Box`
- `Winter Box -> Guest Room Closet`
- `Bottle -> Liquor Room Shelf 2`

### Step 4

Commit the move and return to the subject page with the new current state visible.

## Move Confirmation Rule

The product should not ask for unnecessary confirmation when the move intent is clear and the target is explicit.

Confirmation is most useful when:

- several plausible destination matches exist
- the move is broad or destructive
- the user is moving a container that affects many held items indirectly

Otherwise:

- choose destination
- commit
- show the updated state

## Quantity Update Flow

Quantity updates should be treated as a focused state update, not a full subject edit.

Typical uses:

- count goes up
- count goes down
- set exact count

Guiding rules:

- quantity belongs to `Holding`
- quantity updates should be fast
- quantity changes may later optionally create an event, but should not require one

The user should be able to:

- tap plus/minus for quick changes
- set an exact number when needed

## Current-State Presentation Rule

When retrieval is the main question, the UI should show current state prominently.

That means:

- place
- container
- quantity
- status

should be visible quickly on result cards and subject pages when relevant.

## GPT Rule

GPT-assisted retrieval and move should follow the same logic as the app:

1. identify the likely subject
2. find it
3. confirm ambiguity only when necessary
4. move or update with the user's permissions

GPT should prefer names over ids and should not force the user to think in internal identifiers.

## After-Move Behavior

After a move or quantity change:

- return to the subject page
- show the new state clearly
- optionally surface a lightweight success message

The product should avoid leaving the user in an ambiguous in-between state.

## Scan Move Flow [Provisional]

This section defines the physical-world shortcut flow where scan order implies a move.

The goal is to make repetitive physical organization faster without breaking the subject model.

## Core Scan Move Rule

Scan move is a shortcut built on top of the normal move model.

It does not replace:

- subject identity
- subject pages
- normal move logic

It simply uses scan order to prefill source and destination.

## Supported Scan Move Patterns

### Pattern 1: Item To Container

1. scan item
2. scan container
3. move item into container

### Pattern 2: Container To Place

1. scan container
2. scan place
3. move container into place

These are the primary supported scan-move patterns for the first version.

## Scan Move Steps

### Step 1

Scan the source subject.

The system should identify whether the source is:

- an item-like subject
- a container

### Step 2

Enter move-ready state.

The UI should make it clear the system is waiting for:

- a destination container
- or a destination place

### Step 3

Scan the destination subject.

The system validates whether the destination is compatible.

### Step 4

If valid, show a brief readable preview.

Examples:

- `Move Blue Wool Sweater to Winter Box`
- `Move Winter Box to Guest Room Closet`

### Step 5

Commit the move.

### Step 6

Show success and, when useful, offer:

- `Open subject`
- `Undo`
- `Scan next`

## Scan Move Validation Rules

The system should block invalid patterns such as:

- item -> place directly when the first-version rule expects item -> container
- place -> item
- container -> item
- destination scanning that would create an impossible containment loop

If invalid:

- explain the mismatch simply
- keep the user in a recoverable state

## Scan Move Confirmation Rule

If both scans are explicit and valid, the system should require little or no extra confirmation.

This flow exists to reduce friction.

Use extra confirmation only when:

- multiple scan bindings resolve unexpectedly
- the move would affect a complex nested structure
- the system detects an unusual edge case

## Relationship To Subject Pages

Even though scan move is fast, the underlying truth should still remain visible on the subject pages afterward.

That means:

- the moved subject's page should show the updated state
- the destination context should reflect the new contents
- the user should be able to inspect the result normally

## GPT Relationship

GPT may describe or trigger a move conversationally.

But scan move remains the fastest physical-world version of the same underlying action:

- identify source
- identify destination
- validate
- commit

The product should not let scan move drift into a completely different move system.

## Photo / Media Flow [Provisional]

This section defines the canonical media model and the canonical image interaction model for Tethr.

The goal is:

- one media system
- multiple entry points
- one consistent user experience

The product should not feel like GPT upload, focused upload, event upload, and normal web upload are separate inventions.

## Core Media Principle

Media handling should feel the same everywhere it appears.

That means the user should recognize the same basic pattern across:

- focused upload screens
- subject-page image actions
- item/container/place edit flows
- add-event flows
- GPT handoff flows
- later public contribution flows

## Current Working Rule

GPT does not upload media directly.

Instead:

1. GPT finds or creates the correct subject first
2. GPT offers the user the upload link or focused upload path
3. the actual image upload happens through the same web media flow used elsewhere

This keeps the system consistent and avoids split upload behavior.

## Media Roles

### Subject Photo

An image attached directly to a subject.

Typical use:

- item photo
- container photo
- place photo
- shared subject image

### Event Photo

An image attached to a specific event first.

Typical use:

- repair photo
- tasting photo
- visit photo
- memory photo

### Hero Image

A display role, not a separate upload system.

Typical use:

- the primary image shown on a subject page or tile

Rule:

- a hero image should usually be chosen from already attached subject media
- it should not require a separate special upload flow

### Public Contribution Image

An image contributed by a user to a public/shared subject or timeline.

Typical use:

- park bench time-lapse contribution
- landmark visit photo
- restaurant visit photo on a shared place

## Valid Media Entry Points

Media may be added from:

- the focused upload screen
- a subject page
- a regular web edit or action flow
- an Add Event flow
- a scanned subject page
- a GPT handoff link
- later a public contribution surface

## Canonical Media Interaction Steps

### Step 1: Choose the target

The user should be adding media to one of:

- a subject
- an event

The target should usually already be known by the time upload starts.

### Step 2: Choose the image

Supported input methods should be:

- choose file
- drag and drop when available
- paste when available

The UI copy may vary slightly by device, but the underlying behavior should stay aligned.

### Step 3: Preview immediately

The user should see the selected image before committing.

### Step 4: Crop before save

Cropping should happen before final save, using the same interaction model across surfaces.

### Step 5: Save to the target

The image should attach to the correct subject or event.

### Step 6: Return cleanly

After save, the user should land back in a place where the new image is visible and understandable.

## Cropping Rules [Decided]

Cropping behavior should be consistent across the focused upload screen and the regular web app.

### Crop Slider Rule

The crop slider should start in the middle.

That means:

- the middle position is the neutral/default crop zoom
- sliding left zooms out
- sliding right zooms in

This is important because the user may need to:

- make the image smaller to fit more in frame
- make the image larger to focus on detail

### Crop Preview Rule

The crop preview should update live as the user:

- drags
- zooms
- resets
- chooses a different image

### Crop Interaction Rule

The crop experience should allow:

- zoom out
- zoom in
- reposition image within the frame
- reset crop
- replace the chosen image before save

### Crop Consistency Rule

The crop behavior should work the same way in:

- focused upload
- regular subject image upload
- event image upload when cropping is offered

The product should not develop different crop dialects on different surfaces.

## Subject Photo Vs Event Photo Rule

This distinction is important.

### Subject photo

Use when the image answers:

- what this subject looks like
- what this place is
- what this item is

### Event photo

Use when the image answers:

- what happened at this moment
- what this repair looked like
- what this visit looked like
- what this tasting or occasion looked like

Rule:

- event photos should attach to the event first
- subject photos should attach to the subject first

The UI may still surface both on the subject page.

## Hero Image Rule

The hero image is a presentation role.

It should:

- come from attached subject media by default
- be replaceable by choosing another attached image
- remain conceptually separate from event photos

The first version does not need a complicated hero-image management system.

## Replace / Remove Rule

The user should be able to:

- replace an existing subject image
- remove an image
- add a new one without losing the previous one when the product wants multiple images later

First-version guidance:

- keep replace/remove simple
- do not require users to understand media-library complexity

## Public Contribution Image Rule

Public/shared image contribution should still use the same underlying media model.

But the flow should emphasize:

- contribution to an existing subject
- clear authorship
- clear attachment to the relevant event or timeline moment
- moderation or visibility policy later when needed

The contribution should not silently replace the canonical subject image unless an authorized steward explicitly chooses that later.

## Media Metadata Rule

Media should carry enough metadata to remain useful over time.

Likely metadata includes:

- uploader or creating user
- created time
- original filename when available
- mime type
- dimensions when available
- attachment target
- attachment role
- source surface or entry path when useful

Optional later metadata:

- caption
- alt text
- crop parameters
- location context

## After-Save Behavior

After media upload succeeds:

- the image should appear immediately in the relevant subject or event context
- the user should not be stranded on an ambiguous intermediary state

Typical return targets:

- subject page
- event timeline context
- focused completion state

## Media Flow Pressure Test [Provisional]

This section pressure-tests the media model against four important cases.

### 1. Subject Photo

Example:

- upload a photo of a Blue Wool Sweater

Expected behavior:

- image attaches to the subject
- cropping happens before save
- subject page shows the new photo clearly

### 2. Event Photo

Example:

- add a repair photo while logging furnace maintenance

Expected behavior:

- image attaches to the event first
- subject timeline shows the event with its photo
- the photo may also be discoverable from the subject page

### 3. GPT Upload Handoff

Example:

- GPT creates an item from an image prompt and offers the upload link

Expected behavior:

- GPT does not upload directly
- the upload link opens the focused media flow
- the focused flow uses the same crop and preview model as the rest of the app

### 4. Public Contribution Photo

Example:

- a user scans a park bench QR code and adds a current visit photo

Expected behavior:

- the image contributes to the existing subject
- the contribution is attached to the user's event or timeline entry
- the canonical subject image is not automatically overwritten

## Practical Conclusion

The current media model is viable if the product keeps these rules:

- one upload interaction model
- one crop interaction model
- subject and event photo roles kept distinct
- GPT treated as a handoff into the same media system, not a separate uploader

## Collection / Relationship Flow [Provisional]

This section defines how users express their personal relationship to a subject and how they organize subjects into collections.

The goal is:

- let users say how a subject fits into their life
- let users organize subjects without duplicating them
- keep relationship and collection actions lightweight enough to use often

## Core Collection / Relationship Principle

Collections and personal relationships are overlays on top of existing subjects.

They should not create duplicate subject records.

Examples:

- `Lagavulin 16` stays one subject
- the user may mark it `want_to_try`
- the user may add it to `Peated Whiskies`
- the user may later change the relationship to `tried`

The subject remains the same.

## Two Distinct But Adjacent Actions

### Personal Relationship

This answers:

- what this subject means to me right now

Examples:

- own
- tried
- want_to_try
- visited
- read
- watched
- tracking

Primary record:

- `UserSubjectRelation`

### Collection Membership

This answers:

- which user-defined groups this subject belongs to

Examples:

- Peated Whiskies
- Want To Read
- Summer House Tools
- Baseball Stadiums I Have Visited

Primary records:

- `Collection`
- `CollectionItem`

## Valid Entry Points

This flow may start from:

- a `Subject Page`
- a `Collection Page`
- `Universal Search And Command`
- `Quick Add`
- GPT-assisted flows

Preferred rule:

- the user should usually be able to set relationship and collection membership without leaving the current subject context

## Canonical Relationship Picker Flow

### Step 1

Start from a known subject.

### Step 2

Open the relationship picker.

The picker should present the current primary relationship clearly.

### Step 3

Choose or change the relationship.

First-version relationship action should support:

- setting one primary `relation_type`
- optionally setting `favorite`
- optionally setting `current_star_rating`

### Step 4

Save and return to the subject page with the personal state updated.

## Canonical Collection Picker Flow

### Step 1

Start from a known subject.

### Step 2

Open the collection picker.

The picker should show:

- existing collections
- whether the subject is already in each one

### Step 3

Add or remove the subject from one or more collections.

### Step 4

If needed, create a new collection in-flow without losing context.

### Step 5

Return to the subject page or collection context with membership updated.

## In-Flow Collection Creation Rule

The user should be able to create a collection during the picker flow.

Minimum first-version fields:

- collection title

Common optional fields:

- note or short description
- visibility

The user should not need to leave the flow just to create a new collection.

## Saved Vs Smart Collections

First-version recommendation:

- implement manual collections first

Manual collections:

- user-created
- explicitly managed membership

Later:

- smart collections may be introduced as rule-based or auto-updating views

Examples:

- all whiskies rated 4 stars or higher
- all places visited in 2026
- all tools currently in the summer house

Smart collections should be treated as a later capability, not part of the first relationship picker.

## Subject-Page Presentation Rule

The subject page should show personal overlay information clearly when it exists.

That may include:

- current relationship
- current star rating
- favorite state
- collection membership

These should feel easy to scan, not buried in a settings-style screen.

## Collection Page Rule

A collection page should behave as a real browsing surface, not just a static folder.

It should support:

- collection header
- sort controls
- filter controls
- mixed or typed subject tiles
- later collection-level analysis

The same universal tile grammar should still apply.

## GPT Rule

GPT may help with:

- setting a personal relationship
- adding a subject to an existing collection
- creating a new collection when the user's intent is clear
- analyzing a collection later

But GPT should still:

- find the correct subject first
- find or create the correct collection carefully
- avoid duplicating collections when a clear existing one matches

## Relationship And Collection Pressure Test [Provisional]

### 1. Whisky

- subject: `Lagavulin 16`
- relationship: `want_to_try`
- collection: `Peated Whiskies`
- optional rating later

### 2. Book

- subject: book title
- relationship: `read`
- collection: `Books That Changed Me`

### 3. Restaurant

- subject: restaurant place
- relationship: `visited`
- collection: `Best Austin Restaurants`

### 4. Tool

- subject: tracked instance
- relationship: `tracking`
- collection: `Summer House Tools`

## Practical Conclusion

The collection and relationship flow is viable if the product keeps these rules:

- one subject, many overlays
- personal relationship separate from collection membership
- in-flow collection creation
- manual collections first, smart collections later

## Shared Subject Creation Policy [Provisional]

This section defines how shared/public subjects should be created.

The goal is to keep shared identity clean enough that many users can attach to the same subject without chaos.

## Core Shared-Subject Rule

Shared/public subjects should be harder to create sloppily than personal or workspace-scoped subjects.

The product should optimize for:

- one canonical subject when possible
- clean formatting by domain
- search-first behavior
- duplicate resistance

## Allowed Shared-Subject Creation Paths

### 1. Seeded

Use when:

- importing a trusted set of known subjects
- seeding categories such as restaurants, whiskies, books, movies, or landmarks

Benefits:

- high consistency
- strong duplicate resistance
- predictable formatting

### 2. Steward-Created Official Subject

Use when:

- the owner or steward wants to create and represent their own subject directly
- a brand, studio, venue, or organization wants to ensure the official subject is correct from the start

Examples:

- Diageo creating `Lagavulin 16`
- Warner Bros creating an official movie subject
- a restaurant group creating its official place pages

Benefits:

- highest confidence in canonical identity
- correct official representation
- clean starting point for later personal entries

Rule:

- if a steward creates the official subject, that subject should be treated as the canonical official record unless later moderation or merge logic says otherwise

Important nuance:

- this path should be supported well
- but it should not be treated as the main expected growth path of the whole system

The primary growth model is still encounter-driven:

- users find or create subjects one by one as needed
- official owners may step in when they want to ensure their subjects are fully and correctly represented

### 3. GPT-Assisted

Use when:

- the user expresses the subject naturally
- an image or descriptive context helps identify the subject
- the system can search intelligently and propose likely matches

Benefits:

- better first-pass inference
- better domain recognition
- better conversational ambiguity handling

### 4. Structured Web Create

Use when:

- the user is in the app and no confident existing match exists
- the domain has a clear structured creation form

Rule:

- there should not be one generic blank "create shared subject" form for everything

Instead:

- the user should create shared/public subjects through domain-aware flows

## Domain Profile Rule

Shared/public subjects should use a domain profile even if that begins as a lightweight configuration rather than a first-class entity.

Examples:

- restaurant
- whisky
- book
- movie
- landmark
- stadium

The domain profile should control:

- required fields
- field labels
- duplicate matching strategy
- page formatting emphasis

## Identity Reference Rule

Shared/public subject creation should gather enough identity data to support matching and de-duplication.

Examples:

- normalized name
- city
- address
- country
- year
- author
- brand
- external identifier when available later

This may start as structured metadata before becoming a first-class entity if needed.

## Shared-Subject Creation Pipeline

### Step 1

Identify or choose the likely domain profile.

### Step 2

Search for existing candidates before create.

### Step 3

Show likely matches clearly.

### Step 4

If no confident match exists, collect the minimum structured identity fields for that domain.

### Step 5

Normalize the candidate data and run duplicate checks again.

### Step 6

Create the new shared/public subject only if no strong match remains.

### Step 7

If needed, mark the subject as provisional until stewardship, validation, or merging happens later.

## Web App Rule

The web app should be stricter than GPT for shared-subject creation.

That means:

- search first
- structured fields second
- create last

The web app should not encourage casual duplicate creation through an overly generic form.

## GPT Rule

GPT may have a better chance of identifying and formatting a shared subject correctly.

But GPT should still:

- search first
- show likely matches when ambiguity is meaningful
- create only when no strong match exists

GPT is a smarter intake surface, not a bypass around identity quality.

## Relationship To Scan-First Contribution

If a shared/public subject already has a QR or NFC identity anchor:

- scanning should open that existing subject
- contribution should happen on that subject
- creation should not happen from that scan flow unless the user is explicitly creating a new subject outside the existing anchor

## Steward-First Canonical Subject Rule [Provisional]

If an official owner or steward creates a subject directly, that should be the preferred canonical representation of the subject.

This does not erase user-owned personal records.

Instead:

- the official subject anchors the shared identity
- user personal entries attach to that identity
- the user still feels like they are building their own lists and records

## Shared Subject Lifecycle [Provisional]

This section defines the current working lifecycle for shared/public subjects.

The goal is:

- support organic community growth
- allow official owners to establish canonical records
- handle duplicates without breaking user trust

## Current Lifecycle States

### 1. Provisional

A shared subject exists and is usable, but it has not yet been strongly validated or merged against all likely duplicates.

Common origins:

- encounter-driven user creation
- GPT-assisted first creation
- structured web creation

What it means:

- users can still attach personal entries
- the subject can still become canonical later
- duplicate review may still happen

### 2. Canonical

This is the current preferred shared record for that identity.

What it means:

- users should attach their personal entries here
- search should prefer this record
- duplicates should tend to merge into this record later

Canonical does not automatically mean official-owner-created.

### 3. Official

This is a canonical subject with recognized steward or owner control over the official representation layer.

Typical examples:

- Diageo creating or claiming `Lagavulin 16`
- Warner Bros creating or claiming an official movie subject

What it means:

- the official presentation is steward-controlled
- user personal entries still remain user-owned
- the owner's layer is additive to the shared identity, not a replacement for user records

### 4. Merged

This subject record is no longer the preferred live identity and now redirects to another shared subject.

What it means:

- it remains useful for history and redirection
- search should prefer the surviving canonical record
- personal entries and references should resolve toward the surviving record according to merge policy

## Lifecycle Rules

### Rule 1

Most community-created shared subjects should begin as `provisional`.

### Rule 2

When the system has enough confidence, or when moderation/review has occurred, a provisional subject may become `canonical`.

### Rule 3

An owner or steward may create an `official` subject directly, or may claim an existing canonical subject.

### Rule 4

When duplicates are identified, weaker duplicates should become `merged` rather than simply disappearing.

### Rule 5

User-owned personal entries should survive lifecycle transitions.

The system should not make users feel like their lists, ratings, or memories vanished just because a canonical record changed.

## Growth Model Rule

The shared-subject system should assume:

- community encounter-driven growth as the default
- official owner creation as a supported but non-required path

That balance keeps the system realistic:

- the community can grow the world one subject at a time
- owners can still ensure their important subjects are represented correctly

## Subject Model Pressure Test [Provisional]

This section checks whether the current model can handle a wider range of real examples without inventing new top-level entities too quickly.

Pass condition:

- each example should fit mainly through `Subject`, `Holding`, `UserSubjectRelation`, `Event`, `SubjectLink`, `MediaAttachment`, and `CollectionItem`

## Pressure-Test Examples

### 1. Lagavulin 16

Primary kind:

- `shared_subject`

Likely supporting records:

- `UserSubjectRelation` for tried / want_to_try / own
- `CollectionItem` for whisky lists
- `Event` for tastings and ratings

### 2. Specific bottle of Lagavulin 16

Primary kind:

- `tracked_instance`

Likely supporting records:

- `SubjectLink.instance_of` -> Lagavulin 16
- `Holding` for current shelf or room
- `Event` for opened, shared, consumed

### 3. Basement Furnace

Primary kind:

- `tracked_instance`

Likely supporting records:

- `Holding` for current place
- `Event` for service and repair history
- later `Reminder` for maintenance schedule

### 4. Blue Wool Sweater

Primary kind:

- `stored_inventory`

Likely supporting records:

- `Holding` for Winter Box
- optional `MediaAttachment`

### 5. Gas Cans

Primary kind:

- `stored_inventory`

Likely supporting records:

- `Holding.quantity`
- `Holding.location_subject_id` or `container_subject_id`

### 6. Restaurant

Primary kind:

- usually `place`

Likely supporting records:

- optional `SubjectLink.instance_of` if one location belongs to a chain or broader shared brand
- `UserSubjectRelation` for visited / favorite
- `Event` for a specific visit, meal, photo, or rating

### 7. Book

Primary kind:

- usually `shared_subject`

Likely supporting records:

- `UserSubjectRelation` for read / want_to_read
- `CollectionItem` for reading lists
- `Event` for finished, reviewed, revisited

### 8. Movie

Primary kind:

- usually `shared_subject`

Likely supporting records:

- `UserSubjectRelation` for watched / want_to_watch
- `Event` for a specific viewing or review

### 9. Park Bench As Public Memory Point

Primary kind:

- `place`

Likely supporting records:

- `TagBinding` for QR/NFC identity anchor
- `Event` for visits, contributed photos, notes
- `MediaAttachment` for a growing time-lapse history

### 10. Park Bench As Maintained Object

Primary kind:

- `tracked_instance`

Likely supporting records:

- `Event` for repairs, repainting, inspections
- `Holding` for current park/location context

### 11. Person In The System

Primary kind:

- `person`

Likely supporting records:

- `SubjectLink.stewarded_by`
- `Event` participation
- optional appearance in public/shared histories

## Pressure-Test Result

Current conclusion:

- the model is broad enough to handle the major known examples without requiring a different top-level system for each domain

Current stress points:

- shared/public subject identity quality
- domain-specific formatting and required fields
- future need for a stronger domain profile or identity-reference layer

This suggests the current model is viable, but shared-subject creation discipline will matter a great deal.

## Checklist Backlog

This backlog is intentionally high-level.
It exists so the spec can drive planning and execution.

### Foundation

- [x] Create master architecture/spec file
- [x] Define page inventory
- [x] Define action inventory
- [ ] Mark major sections explicitly as `Decided`, `Provisional`, or `Open`
- [x] Add canonical data entities
- [x] Add permissions matrix

### Subject System

- [x] Define canonical subject page in prose
- [x] Create canonical subject page wireframe
- [x] Define controlled vocabularies for major entities and actions
- [x] Define exact subject typing rules
- [x] Define the boundary between shared subject, tracked instance, stored inventory, and place
- [x] Define the relationship model between those subject types

### Core Flows

- [x] Define Quick Add flow in detail
- [x] Define Add Event flow in detail
- [x] Define Find / Move / Retrieve flow in detail
- [x] Define scan move flow in detail
- [x] Define scan-first contribution principle
- [x] Define collection / relationship picker flow

### Safe Implementation Path

- [x] Define the first additive implementation slice over the current Arca system
- [ ] Implement the real `Home -> Results -> Subject View` shell without breaking current flows

### Media

- [x] Define canonical media model
- [x] Define subject photo vs event photo behavior
- [x] Define hero image rules
- [x] Define public contribution media rules

### Steward / Public / AI

- [ ] Define steward / owner capabilities clearly
- [ ] Define public contribution rules
- [x] Define shared-subject creation policy
- [ ] Define moderation and abuse-handling requirements
- [ ] Define GPT / AI action model
- [ ] Define reminder / notification model

## Spec Maintenance Rules

Going forward:

- settled architecture should be promoted into this file
- supporting docs can remain more exploratory
- if a decision affects multiple surfaces, it belongs here
- if a decision changes implementation detail but not product behavior, it may stay in a supporting doc

This file should become the project's operational spec, not just a summary.
