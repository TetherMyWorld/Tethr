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
- built-in `node:sqlite` database
- local file storage for photos under `data/uploads`
- no external packages required

## Run locally

1. Run `node src/server.js`
2. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)
3. Create a location if you want one
4. Create a container
5. Open the container and add items

## Important files

- [src/server.js](/F:/Tethr/TethrArca/src/server.js)
- [src/db.js](/F:/Tethr/TethrArca/src/db.js)
- [src/ui.js](/F:/Tethr/TethrArca/src/ui.js)

## Notes

- The local SQLite database is created automatically at `data/tethrarca.sqlite`
- Uploaded images are stored automatically in `data/uploads`
- The old nested-container structure has been flattened to match the simpler model
