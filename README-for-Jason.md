# TethrArca for Jason

This is a local copy of `TethrArca`, a simple inventory app for:

`Location -> Container -> Item`

Examples:
- `Location`: Attic, Basement, Garage
- `Container`: Arca 1, Arca 2, Box, Bin
- `Item`: Oranges, Pineapples, Drill, Extension Cord

## What Jason Needs

Jason should have:
- Windows
- `Node.js` installed

Important:
- This project uses built-in SQLite support from modern Node.js.
- If `node src/server.js` fails because of SQLite support, install a current Node.js version.

## How to Run It

1. Unzip this folder somewhere on the computer.
2. Open PowerShell.
3. Go into the project folder:

```powershell
cd path\to\TethrArca
```

4. Start the app:

```powershell
node src/server.js
```

5. Open this in a browser:

[http://127.0.0.1:3000](http://127.0.0.1:3000)

## How to Stop It

In the PowerShell window where it is running, press:

```powershell
Ctrl + C
```

## What Is Included

This package includes:
- the app code
- the current local database
- uploaded images

That means Jason should see the same test data that exists right now.

## Important Notes

- This is a local app, not a cloud app yet.
- Jason's copy will be separate from Andy's copy.
- Changes Jason makes on his computer will not automatically show up on Andy's computer.

## Main Files

- `src/server.js`
- `src/db.js`
- `src/ui.js`
- `data/tethrarca.sqlite`

## Current Features

- create locations
- create containers
- create items
- upload one image per container
- upload one image per item
- search
- item and container history
- tag/token assignment groundwork for QR/NFC scanning

