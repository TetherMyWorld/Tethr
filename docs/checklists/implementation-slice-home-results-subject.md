# First Implementation Slice Checklist

## Goal

Build the first safe unified Tethr shell on top of the current working Arca system.

This checklist corresponds to `First Implementation Slice: Unified Shell Over Existing Arca` in [tethr-architecture.md](/F:/Tethr/TethrArca/docs/tethr-architecture.md).

## Guardrails

- do not break current location/container/item CRUD
- do not break focused `/arca` editing
- do not rewrite the schema first
- do not replace working photo upload and crop flows
- prefer UI-layer adapters over backend rewrites

## Checklist

### Home

- [x] Implement the iconic home page shell in the real app
- [x] Preserve a quiet account-access control
- [x] Add explicit submit/search action
- [x] Route submitted search into the dedicated results page

### Results

- [x] Implement the dedicated mixed-type results page in the real app
- [x] Use the canonical mixed-type card grammar
- [x] Reuse current search endpoint safely
- [x] Apply the default `Best match` philosophy
- [x] Add first-version type filters

### Subject View

- [x] Implement the first unified subject-view shell for:
  - places
  - containers
  - personal things/items
- [x] Map current detail payloads into the new shell without backend rewrites
- [x] Keep current edit actions reachable from the new shell
- [x] Keep current move/history/media actions reachable from the new shell

### Adapters

- [x] Define a UI-layer adapter for search results
- [x] Define a UI-layer adapter for location detail payloads
- [x] Define a UI-layer adapter for container detail payloads
- [x] Define a UI-layer adapter for item detail payloads

### Validation

- [x] Confirm current `/arca` focused edit flow still works unchanged
- [x] Confirm current image upload/crop still works unchanged
- [ ] Confirm current move flows still work unchanged
- [x] Confirm the new shell can coexist with current routes during rollout

## Output Of This Slice

- [ ] The first implementation slice is complete when `Home -> Results -> Subject View` feels coherent in the real app while current working Arca operations remain intact underneath
