# Core Flows Checklist

## Goal

Define the highest-friction, highest-value workflows in enough detail that they can be designed and implemented cleanly.

## Priority Flows

### 1. Quick Add

- [x] Define all valid entry points
- [x] Decide how much AI fills automatically
- [x] Decide the minimum user confirmation needed
- [x] Define what happens after create succeeds
- [x] Define the mobile-first version
- [x] Define the GPT-handoff version

### 2. Add Event

- [x] Define event creation entry points
- [x] Define the minimum event fields
- [x] Define optional structured template fields
- [x] Define media attachment behavior
- [x] Define date/time handling
- [x] Define privacy handling

### 3. Find / Move / Retrieve

- [x] Define the search-first path
- [x] Define the subject-page path
- [x] Define the scan path
- [x] Define move confirmation behavior
- [x] Define quantity update behavior
- [x] Define scan move behavior

### 4. Photo / Media Flow

- [x] Define subject photo vs event photo rules
- [x] Define hero image rules
- [x] Define replace / remove behavior
- [x] Define public contribution image behavior
- [x] Define what metadata media should carry

### 5. Collection / Relationship Flow

- [x] Define the relationship picker
- [x] Define collection creation in-flow
- [x] Define saved collections vs smart collections
- [x] Define how collections appear on subject pages

## Definition Of Ready

A flow is ready to implement when:

- the start surface is known
- the end surface is known
- the visible actions are known
- the minimum required fields are known
- the edge cases are known well enough not to surprise the user
