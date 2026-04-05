# Phase 2 Subject Model And State Checklist

## Goal

Turn the subject model into an implementation-ready system for identity, state, placement, and scan anchors.

This checklist corresponds to `Phase 2: Subject Model And State` in [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md).

## Checklist

### Canonical entities

- [x] Define canonical data entities
- [x] Define likely fields for each canonical entity
- [x] Sort entities into MVP, phase 2, and later
- [ ] Confirm which entity fields are truly first-version required versus optional

### Subject typing and relationships

- [x] Define controlled vocabularies
- [x] Define subject typing rules
- [x] Define the boundary between shared subject, tracked instance, stored inventory, place, container, and person
- [x] Define the relationship model between subject types
- [ ] Decide whether `domain profile` begins as metadata or a first-class entity
- [ ] Decide whether `identity reference` begins as metadata or a first-class entity

### State and placement

- [x] Define `Holding` as the home of current placement and quantity
- [x] Define quantity as Arca/state-only
- [x] Define `Find / Move / Retrieve` flow
- [x] Define `scan move` flow
- [ ] Harden first-version move constraints so app and GPT use the same rules

### Scan and identity anchors

- [x] Define `TagBinding` as a canonical identity anchor
- [x] Define scan-first contribution principle
- [ ] Decide exact first-version QR/NFC assignment and reassignment rules

### Output of this phase

- [ ] Phase 2 is complete when identity, state, movement, and scan behavior are stable enough to implement without reopening core ontology questions
