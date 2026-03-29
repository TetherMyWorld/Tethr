import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sqliteFile = path.join(projectRoot, "data", "tethrarca.sqlite");
const sourceUploadsDir = path.join(projectRoot, "data", "uploads");
const seedDir = path.join(projectRoot, "seed");
const seedStateFile = path.join(seedDir, "state.json");
const seedUploadsDir = path.join(seedDir, "uploads");

if (!fs.existsSync(sqliteFile)) {
  throw new Error(`SQLite file not found at ${sqliteFile}`);
}

fs.mkdirSync(seedUploadsDir, { recursive: true });

const db = new DatabaseSync(sqliteFile);

const state = {
  version: 1,
  exported_at: new Date().toISOString(),
  workspace: db.prepare("SELECT * FROM workspaces ORDER BY created_at ASC LIMIT 1").get(),
  locations: db.prepare("SELECT * FROM locations ORDER BY name ASC").all(),
  containers: db.prepare("SELECT * FROM containers ORDER BY name ASC").all(),
  items: db.prepare("SELECT * FROM items ORDER BY name ASC").all(),
  photos: db.prepare("SELECT * FROM photos ORDER BY created_at ASC").all(),
  move_log: db.prepare("SELECT * FROM move_log ORDER BY moved_at ASC").all(),
  item_history: db.prepare("SELECT * FROM item_history ORDER BY created_at ASC").all(),
  item_event_log: db.prepare("SELECT * FROM item_event_log ORDER BY created_at ASC").all(),
  container_event_log: db.prepare("SELECT * FROM container_event_log ORDER BY created_at ASC").all(),
  container_activity_log: db.prepare("SELECT * FROM container_activity_log ORDER BY created_at ASC").all(),
  tags: db.prepare("SELECT * FROM tags ORDER BY created_at ASC").all()
};

fs.writeFileSync(seedStateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");

if (fs.existsSync(sourceUploadsDir)) {
  for (const entry of fs.readdirSync(sourceUploadsDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const from = path.join(sourceUploadsDir, entry.name);
    const to = path.join(seedUploadsDir, entry.name);
    fs.copyFileSync(from, to);
  }
}

console.log(`Exported seed state to ${seedStateFile}`);
