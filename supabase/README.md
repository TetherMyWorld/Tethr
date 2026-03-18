## Supabase Setup

This folder is the first migration step from the current local SQLite app to a hosted beta setup.

### What is here

- `001_initial_schema.sql`
  - a Postgres version of the tables the app currently uses
  - meant to be pasted into the Supabase SQL editor

### Current status

The live app still uses:

- local SQLite
- local uploads
- local server sessions

So this schema does **not** switch the app to Supabase by itself yet.

### Next order

1. Open the Supabase SQL editor.
2. Run `001_initial_schema.sql`.
3. Verify the tables were created.
4. Next, wire the app's data layer from SQLite to Supabase/Postgres.
5. After that, move uploads from local files to Supabase Storage.
6. Then deploy the app to Vercel.

### Important note

This schema mirrors the current working app so we can migrate safely.
It is intentionally conservative.
We can clean up legacy columns later after the hosted version is stable.
