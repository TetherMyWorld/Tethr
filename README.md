# TethrArca

TethrArca is a local-first inventory web app built around a simple structure:

`Location -> Container -> Item`

Locations are optional.

## Current model

- A `Location` is a place like a basement, garage, room, or warehouse
- A `Container` is something like a shelf, box, tote, or bin
- An `Item` always belongs to one container
- Containers do **not** contain other containers

## What this version does

- Create optional locations
- Create containers with or without a location
- Open any container on its own URL
- Add items directly inside a container
- Move containers between locations
- Move items between containers
- Delete a container and automatically delete the items/photos inside it
- Search locations, containers, and items
- Upload photos for items

## Local stack

- `Node.js` server
- JSON state persisted under `data/state.local.json`
- local file storage for photos under `data/uploads`
- optional Vercel Blob storage for deployed persistence

## Run locally

1. Run `npm install`
2. Run `node src/server.js`
3. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Deploy to Vercel

1. Create a Blob store and attach it to the project so `BLOB_READ_WRITE_TOKEN` is available.
2. Deploy the repo to Vercel.
3. The app entrypoint is `api/index.js`, and `vercel.json` rewrites the app routes there.

## Seed data

- The tracked deployment seed lives in `seed/state.json`
- Seed images live in `seed/uploads`
- To refresh the seed from the old local SQLite database, run `npm run seed:sqlite`
- Local runtime writes still go to `data/`, which remains ignored
4. Create a location if you want one
5. Create a container
6. Open the container and add items

## Important files

- [src/server.js](/F:/Tethr/TethrArca/src/server.js)
- [src/db.js](/F:/Tethr/TethrArca/src/db.js)
- [src/ui.js](/F:/Tethr/TethrArca/src/ui.js)

## Notes

- Uploaded images are stored automatically in `data/uploads` locally
- When deployed with Blob attached, state and uploads are persisted remotely
- Without `BLOB_READ_WRITE_TOKEN` on Vercel, the app falls back to temporary `/tmp` storage
