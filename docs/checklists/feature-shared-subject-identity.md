# Shared Subject Identity Checklist

## Goal

Make shared/public subject creation clean enough to avoid duplicate sprawl while still feeling usable.

## Checklist

### Creation policy

- [x] Define the shared-subject creation policy
- [ ] Define the steward-created official subject path
- [ ] Clarify that steward-created official subjects are supported but not the primary growth model
- [ ] Decide which domains are allowed in first version
- [ ] Define first-version required fields for each allowed domain

### Matching and duplication

- [ ] Define the matching pipeline before create
- [ ] Define what counts as a strong candidate match
- [ ] Define what the user sees when likely duplicates exist
- [ ] Define merge / canonicalize lifecycle at a product level

### Domain profile layer

- [ ] Decide whether `domain profile` is config, metadata, or entity
- [ ] Define first-version profiles such as restaurant, whisky, book, movie, landmark
- [ ] Define which UI fields and labels each profile controls

### Identity reference layer

- [ ] Decide whether `identity reference` is config, metadata, or entity
- [ ] Define the minimum identity fields per first-version domain
- [ ] Define how seeded, GPT-assisted, and structured web creation all use the same matching rules

### Stewardship

- [ ] Define how a shared subject becomes stewarded
- [ ] Define what stewardship can edit versus what remains user-contributed
- [ ] Define the universal personal-entry base layer for shared subjects
- [ ] Define the field-level base personal-entry schema
- [ ] Define how owner-added questions or prompts layer on top without replacing the universal entry model

### Output

- [ ] This feature area is ready when shared/public subject creation can be implemented without falling back to a generic blank create form
