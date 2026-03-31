import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { slugify } from "./domain.js";

const runningHosted = Boolean(process.env.VERCEL);
const dataDir = runningHosted
  ? path.join(os.tmpdir(), "tethrarca-data")
  : path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbFile = path.join(dataDir, "tethrarca.sqlite");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new DatabaseSync(dbFile);
const requestContextStorage = new AsyncLocalStorage();
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    parent_container_id TEXT,
    location_id TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    rfid_tag_id TEXT NOT NULL DEFAULT '',
    image_file_name TEXT NOT NULL DEFAULT '',
    image_stored_name TEXT NOT NULL DEFAULT '',
    image_mime_type TEXT NOT NULL DEFAULT '',
    image_size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    container_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    caption TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS move_log (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('item', 'container')),
    entity_id TEXT NOT NULL,
    from_container_id TEXT,
    to_container_id TEXT,
    from_location_id TEXT,
    to_location_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    moved_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS item_history (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('quantity_changed')),
    from_quantity INTEGER,
    to_quantity INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS item_event_log (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('renamed', 'image_changed')),
    from_text TEXT NOT NULL DEFAULT '',
    to_text TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS container_event_log (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    container_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('renamed', 'image_changed')),
    from_text TEXT NOT NULL DEFAULT '',
    to_text TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS container_activity_log (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    container_id TEXT NOT NULL,
    item_id TEXT,
    item_name TEXT NOT NULL DEFAULT '',
    action_type TEXT NOT NULL CHECK (action_type IN ('item_added', 'item_removed', 'quantity_changed')),
    from_quantity INTEGER,
    to_quantity INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dream_entries (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    dream_summary TEXT NOT NULL,
    restfulness_rating INTEGER CHECK (
      restfulness_rating IS NULL
      OR (restfulness_rating BETWEEN 1 AND 5)
    ),
    wake_feeling TEXT NOT NULL DEFAULT '',
    sleep_context_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('unassigned', 'assigned')),
    source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'external')),
    entity_type TEXT CHECK (entity_type IN ('location', 'container', 'item')),
    entity_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS aura_whiskies (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    canonical_name TEXT NOT NULL DEFAULT '',
    distillery TEXT NOT NULL,
    expression TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    style TEXT NOT NULL DEFAULT '',
    age_statement TEXT NOT NULL DEFAULT '',
    abv TEXT NOT NULL DEFAULT '',
    cask_type TEXT NOT NULL DEFAULT '',
    price_usd REAL,
    reference_notes TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS aura_whisky_user_notes (
    id TEXT PRIMARY KEY,
    whisky_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    tasting_notes TEXT NOT NULL DEFAULT '',
    personal_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (whisky_id) REFERENCES aura_whiskies(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS aura_whisky_entries (
    id TEXT PRIMARY KEY,
    whisky_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    entry_text TEXT NOT NULL DEFAULT '',
    archived_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (whisky_id) REFERENCES aura_whiskies(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

ensureWorkspace();
ensureColumn("workspaces", "owner_user_id", "TEXT");
ensureColumn("containers", "location_id", "TEXT");
ensureColumn("containers", "image_file_name", "TEXT NOT NULL DEFAULT ''");
ensureColumn("containers", "image_stored_name", "TEXT NOT NULL DEFAULT ''");
ensureColumn("containers", "image_mime_type", "TEXT NOT NULL DEFAULT ''");
ensureColumn("containers", "image_size_bytes", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("move_log", "from_location_id", "TEXT");
ensureColumn("move_log", "to_location_id", "TEXT");
ensureContainerActivityLogShape();
flattenLegacyHierarchy();
ensureColumn("tags", "source", "TEXT NOT NULL DEFAULT 'generated'");
ensureColumn("aura_whiskies", "canonical_name", "TEXT NOT NULL DEFAULT ''");
ensureColumn("aura_whiskies", "style", "TEXT NOT NULL DEFAULT ''");
ensureColumn("aura_whiskies", "price_usd", "REAL");
ensureColumn("aura_whisky_entries", "archived_at", "TEXT NOT NULL DEFAULT ''");
db.exec(`
  DROP INDEX IF EXISTS idx_aura_whiskies_name;
  CREATE INDEX IF NOT EXISTS idx_locations_workspace ON locations (workspace_id, name);
  CREATE INDEX IF NOT EXISTS idx_containers_workspace_location ON containers (workspace_id, location_id, name);
  CREATE INDEX IF NOT EXISTS idx_items_workspace_container ON items (workspace_id, container_id, name);
  CREATE INDEX IF NOT EXISTS idx_item_history_item_created ON item_history (workspace_id, item_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_item_event_log_item_created ON item_event_log (workspace_id, item_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_container_event_log_container_created ON container_event_log (workspace_id, container_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_container_activity_log_container_created ON container_activity_log (workspace_id, container_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dream_entries_workspace_user_created ON dream_entries (workspace_id, user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tags_workspace_token ON tags (workspace_id, token);
  CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags (workspace_id, entity_type, entity_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_unique ON workspace_members (workspace_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id, workspace_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id, expires_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_whiskies_name_unique ON aura_whiskies (name, distillery);
  CREATE INDEX IF NOT EXISTS idx_aura_whiskies_slug ON aura_whiskies (slug);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_whisky_user_notes_unique ON aura_whisky_user_notes (whisky_id, workspace_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_aura_whisky_user_notes_workspace_user ON aura_whisky_user_notes (workspace_id, user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_aura_whisky_entries_workspace_user_created ON aura_whisky_entries (workspace_id, user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_aura_whisky_entries_whisky_created ON aura_whisky_entries (whisky_id, created_at DESC);
`);

function now() {
  return new Date().toISOString();
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function requestContext() {
  return requestContextStorage.getStore() || null;
}

export function runWithRequestContext(context, callback) {
  return requestContextStorage.run(context || {}, callback);
}

function happenedWithinSeconds(timestamp, seconds) {
  if (!timestamp) {
    return false;
  }
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) {
    return false;
  }
  return Date.now() - value <= seconds * 1000;
}

function ensureWorkspace() {
  const row = db.prepare("SELECT id FROM workspaces LIMIT 1").get();
  if (row) {
    return row.id;
  }

  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(id, "Personal Inventory", timestamp, timestamp);
  return id;
}

function workspaceId() {
  const currentWorkspaceId = requestContext()?.workspaceId || null;
  if (!currentWorkspaceId) {
    throw new Error("Please sign in.");
  }
  return currentWorkspaceId;
}

function currentUserId() {
  return requestContext()?.userId || null;
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function flattenLegacyHierarchy() {
  const columns = db.prepare("PRAGMA table_info(containers)").all();
  if (columns.some((column) => column.name === "parent_container_id")) {
    db.exec("UPDATE containers SET parent_container_id = NULL WHERE parent_container_id IS NOT NULL");
  }
}

function ensureContainerActivityLogShape() {
  const tableSql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'container_activity_log'"
  ).get()?.sql || "";
  const columns = db.prepare("PRAGMA table_info(container_activity_log)").all();
  const hasFromQuantity = columns.some((column) => column.name === "from_quantity");
  const hasToQuantity = columns.some((column) => column.name === "to_quantity");
  const supportsQuantityChanged = tableSql.includes("'quantity_changed'");

  if (hasFromQuantity && hasToQuantity && supportsQuantityChanged) {
    return;
  }

  db.exec(`
    ALTER TABLE container_activity_log RENAME TO container_activity_log_legacy;

    CREATE TABLE container_activity_log (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      container_id TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL DEFAULT '',
      action_type TEXT NOT NULL CHECK (action_type IN ('item_added', 'item_removed', 'quantity_changed')),
      from_quantity INTEGER,
      to_quantity INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE
    );

    INSERT INTO container_activity_log (
      id, workspace_id, container_id, item_id, item_name, action_type, from_quantity, to_quantity, notes, created_at
    )
    SELECT
      id, workspace_id, container_id, item_id, item_name, action_type, NULL, NULL, notes, created_at
    FROM container_activity_log_legacy;

    DROP TABLE container_activity_log_legacy;
  `);
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }
  return email;
}

export function normalizeUserEmail(value) {
  return normalizeEmail(value);
}

function getUserByEmail(email) {
  return db.prepare(
    `SELECT id, google_id, email, name, avatar, created_at, updated_at
     FROM users
     WHERE email = ?`
  ).get(normalizeEmail(email));
}

function getUserByGoogleId(googleId) {
  const cleanGoogleId = String(googleId || "").trim();
  if (!cleanGoogleId) {
    return null;
  }
  return db.prepare(
    `SELECT id, google_id, email, name, avatar, created_at, updated_at
     FROM users
     WHERE google_id = ?`
  ).get(cleanGoogleId);
}

function getUserById(id) {
  return db.prepare(
    `SELECT id, google_id, email, name, avatar, created_at, updated_at
     FROM users
     WHERE id = ?`
  ).get(id);
}

function mapUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    googleId: row.google_id || "",
    email: row.email,
    name: row.name,
    avatar: row.avatar || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getWorkspaceRow(id) {
  return db.prepare(
    `SELECT id, name, owner_user_id, created_at, updated_at
     FROM workspaces
     WHERE id = ?`
  ).get(id);
}

function mapWorkspace(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function listWorkspacesForUser(userId) {
  return db.prepare(
    `SELECT w.id, w.name, w.owner_user_id, w.created_at, w.updated_at, wm.role
     FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.user_id = ?
     ORDER BY w.created_at ASC`
  ).all(userId).map((row) => ({
    ...mapWorkspace(row),
    role: row.role
  }));
}

function createWorkspaceForUser(user, nameOverride = "") {
  const workspaceIdValue = randomUUID();
  const timestamp = now();
  const preferredName = String(nameOverride || "").trim() || `${String(user.name || "My").trim()}'s Tethr`;
  db.prepare(
    `INSERT INTO workspaces (id, name, owner_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(workspaceIdValue, preferredName, user.id, timestamp, timestamp);
  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
     VALUES (?, ?, ?, 'owner', ?)`
  ).run(randomUUID(), workspaceIdValue, user.id, timestamp);
  return getWorkspaceRow(workspaceIdValue);
}

function claimLegacyWorkspaceForUser(user) {
  const orphan = db.prepare(
    `SELECT w.id, w.name, w.owner_user_id, w.created_at, w.updated_at
     FROM workspaces w
     LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
     GROUP BY w.id
     HAVING COUNT(wm.id) = 0
     ORDER BY w.created_at ASC
     LIMIT 1`
  ).get();
  if (!orphan) {
    return null;
  }
  const timestamp = now();
  db.prepare(
    `UPDATE workspaces
     SET owner_user_id = COALESCE(owner_user_id, ?), updated_at = ?
     WHERE id = ?`
  ).run(user.id, timestamp, orphan.id);
  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
     VALUES (?, ?, ?, 'owner', ?)`
  ).run(randomUUID(), orphan.id, user.id, timestamp);
  return getWorkspaceRow(orphan.id);
}

function ensureWorkspaceForUser(user) {
  const existing = listWorkspacesForUser(user.id)[0] || null;
  if (existing) {
    return existing;
  }
  return claimLegacyWorkspaceForUser(user) || createWorkspaceForUser(user);
}

function createSessionForUser(user, workspace) {
  const timestamp = now();
  const sessionToken = randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, token, user_id, workspace_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), sessionToken, user.id, workspace.id, timestamp, addDays(timestamp, 30));
  return sessionToken;
}

export function signInWithEmail(input = {}) {
  const email = normalizeEmail(input.email);
  const displayName = String(input.name || "").trim();
  const timestamp = now();
  let user = getUserByEmail(email);

  if (!user) {
    const userId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, google_id, email, name, avatar, created_at, updated_at)
       VALUES (?, '', ?, ?, '', ?, ?)`
    ).run(
      userId,
      email,
      displayName || email.split("@")[0],
      timestamp,
      timestamp
    );
    user = getUserById(userId);
  } else if (displayName && displayName !== user.name) {
    db.prepare(
      `UPDATE users
       SET name = ?, updated_at = ?
       WHERE id = ?`
    ).run(displayName, timestamp, user.id);
    user = getUserById(user.id);
  }

  const workspace = ensureWorkspaceForUser(user);
  const sessionToken = createSessionForUser(user, workspace);

  return {
    sessionToken,
    user: mapUser(user),
    workspace: mapWorkspace(workspace),
    workspaces: listWorkspacesForUser(user.id)
  };
}

export function signInWithGoogleProfile(input = {}) {
  const googleId = String(input.googleId || "").trim();
  if (!googleId) {
    throw new Error("Google account id is required");
  }
  const email = normalizeEmail(input.email);
  const displayName = String(input.name || "").trim();
  const avatar = String(input.avatar || "").trim();
  const timestamp = now();

  let user = getUserByGoogleId(googleId) || getUserByEmail(email);

  if (!user) {
    const userId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, google_id, email, name, avatar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      googleId,
      email,
      displayName || email.split("@")[0],
      avatar,
      timestamp,
      timestamp
    );
    user = getUserById(userId);
  } else {
    db.prepare(
      `UPDATE users
       SET google_id = ?, email = ?, name = ?, avatar = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      googleId,
      email,
      displayName || user.name,
      avatar || user.avatar || "",
      timestamp,
      user.id
    );
    user = getUserById(user.id);
  }

  const workspace = ensureWorkspaceForUser(user);
  const sessionToken = createSessionForUser(user, workspace);

  return {
    sessionToken,
    user: mapUser(user),
    workspace: mapWorkspace(workspace),
    workspaces: listWorkspacesForUser(user.id)
  };
}

export function getSessionByToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    return null;
  }
  const row = db.prepare(
    `SELECT s.id, s.token, s.user_id, s.workspace_id, s.created_at, s.expires_at,
            u.google_id, u.email, u.name, u.avatar, u.created_at AS user_created_at, u.updated_at AS user_updated_at,
            w.name AS workspace_name, w.owner_user_id, w.created_at AS workspace_created_at, w.updated_at AS workspace_updated_at,
            wm.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN workspaces w ON w.id = s.workspace_id
     JOIN workspace_members wm ON wm.workspace_id = s.workspace_id AND wm.user_id = s.user_id
     WHERE s.token = ?
     LIMIT 1`
  ).get(cleanToken);
  if (!row) {
    return null;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(cleanToken);
    return null;
  }
  return {
    token: row.token,
    user: {
      id: row.user_id,
      googleId: row.google_id || "",
      email: row.email,
      name: row.name,
      avatar: row.avatar || "",
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at
    },
    workspace: {
      id: row.workspace_id,
      name: row.workspace_name,
      ownerUserId: row.owner_user_id || null,
      createdAt: row.workspace_created_at,
      updatedAt: row.workspace_updated_at,
      role: row.role
    },
    workspaces: listWorkspacesForUser(row.user_id),
    expiresAt: row.expires_at
  };
}

export function signOutSession(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    return;
  }
  db.prepare("DELETE FROM sessions WHERE token = ?").run(cleanToken);
}

export function hydrateWorkspaceSnapshot(snapshot = {}) {
  const session = snapshot.session || null;
  if (!session?.workspace?.id || !session?.user?.id) {
    throw new Error("A hosted session is required to hydrate workspace data");
  }

  const workspace = session.workspace;
  const user = session.user;
  const workspaces = Array.isArray(session.workspaces) ? session.workspaces : [workspace];
  const locations = Array.isArray(snapshot.locations) ? snapshot.locations : [];
  const containers = Array.isArray(snapshot.containers) ? snapshot.containers : [];
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const photos = Array.isArray(snapshot.photos) ? snapshot.photos : [];
  const tags = Array.isArray(snapshot.tags) ? snapshot.tags : [];
  const moveLog = Array.isArray(snapshot.moveLog) ? snapshot.moveLog : [];
  const itemHistory = Array.isArray(snapshot.itemHistory) ? snapshot.itemHistory : [];
  const itemEventLog = Array.isArray(snapshot.itemEventLog) ? snapshot.itemEventLog : [];
  const containerEventLog = Array.isArray(snapshot.containerEventLog) ? snapshot.containerEventLog : [];
  const containerActivityLog = Array.isArray(snapshot.containerActivityLog) ? snapshot.containerActivityLog : [];
  const dreamEntries = Array.isArray(snapshot.dreamEntries) ? snapshot.dreamEntries : [];
  const auraWhiskies = Array.isArray(snapshot.auraWhiskies) ? snapshot.auraWhiskies : [];
  const auraWhiskyUserNotes = Array.isArray(snapshot.auraWhiskyUserNotes) ? snapshot.auraWhiskyUserNotes : [];
  const auraWhiskyEntries = Array.isArray(snapshot.auraWhiskyEntries) ? snapshot.auraWhiskyEntries : [];

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO users (id, google_id, email, name, avatar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         google_id = excluded.google_id,
         email = excluded.email,
         name = excluded.name,
         avatar = excluded.avatar,
         updated_at = excluded.updated_at`
    ).run(
      user.id,
      user.googleId || "",
      user.email,
      user.name,
      user.avatar || "",
      user.createdAt || now(),
      user.updatedAt || now()
    );

    for (const knownWorkspace of workspaces) {
      if (!knownWorkspace?.id) {
        continue;
      }
      db.prepare(
        `INSERT INTO workspaces (id, name, owner_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           owner_user_id = excluded.owner_user_id,
           updated_at = excluded.updated_at`
      ).run(
        knownWorkspace.id,
        knownWorkspace.name || "Tethr",
        knownWorkspace.ownerUserId || user.id,
        knownWorkspace.createdAt || now(),
        knownWorkspace.updatedAt || now()
      );

      db.prepare(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(workspace_id, user_id) DO UPDATE SET
           role = excluded.role`
      ).run(
        `${knownWorkspace.id}:${user.id}`,
        knownWorkspace.id,
        user.id,
        knownWorkspace.role || "owner",
        knownWorkspace.createdAt || now()
      );
    }

    const workspaceIdValue = workspace.id;
    db.prepare("DELETE FROM tags WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM container_activity_log WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM container_event_log WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM item_event_log WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM item_history WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM move_log WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM photos WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM items WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM containers WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM locations WHERE workspace_id = ?").run(workspaceIdValue);
    db.prepare("DELETE FROM dream_entries WHERE workspace_id = ? AND user_id = ?").run(workspaceIdValue, user.id);
    db.prepare("DELETE FROM aura_whisky_entries WHERE workspace_id = ? AND user_id = ?").run(workspaceIdValue, user.id);
    db.prepare("DELETE FROM aura_whisky_user_notes WHERE workspace_id = ? AND user_id = ?").run(workspaceIdValue, user.id);
    db.exec("DELETE FROM aura_whiskies");

    for (const location of locations) {
      db.prepare(
        `INSERT INTO locations (id, workspace_id, name, description, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        location.id,
        workspaceIdValue,
        location.name || "",
        location.description || "",
        location.notes || "",
        location.created_at || location.createdAt || now(),
        location.updated_at || location.updatedAt || now()
      );
    }

    for (const container of containers) {
      db.prepare(
        `INSERT INTO containers (
           id, workspace_id, parent_container_id, location_id, name, slug, type, description, notes, rfid_tag_id,
           image_file_name, image_stored_name, image_mime_type, image_size_bytes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        container.id,
        workspaceIdValue,
        container.parent_container_id || null,
        container.location_id || null,
        container.name || "",
        container.slug || "",
        container.type || "Container",
        container.description || "",
        container.notes || "",
        container.rfid_tag_id || "",
        container.image_file_name || "",
        container.image_stored_name || "",
        container.image_mime_type || "",
        container.image_size_bytes || 0,
        container.created_at || now(),
        container.updated_at || now()
      );
    }

    for (const item of items) {
      db.prepare(
        `INSERT INTO items (id, workspace_id, container_id, name, description, notes, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        item.id,
        workspaceIdValue,
        item.container_id,
        item.name || "",
        item.description || "",
        item.notes || "",
        item.quantity || 1,
        item.created_at || now(),
        item.updated_at || now()
      );
    }

    for (const photo of photos) {
      db.prepare(
        `INSERT INTO photos (id, workspace_id, item_id, file_name, stored_name, mime_type, size_bytes, caption, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        photo.id,
        workspaceIdValue,
        photo.item_id,
        photo.file_name || "",
        photo.stored_name || "",
        photo.mime_type || "",
        photo.size_bytes || 0,
        photo.caption || "",
        photo.created_at || now()
      );
    }

    for (const tag of tags) {
      db.prepare(
        `INSERT INTO tags (id, workspace_id, token, status, source, entity_type, entity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        tag.id,
        workspaceIdValue,
        tag.token,
        tag.status || "unassigned",
        tag.source || "generated",
        tag.entity_type || null,
        tag.entity_id || null,
        tag.created_at || now(),
        tag.updated_at || now()
      );
    }

    for (const entry of moveLog) {
      db.prepare(
        `INSERT INTO move_log (
           id, workspace_id, entity_type, entity_id, from_container_id, to_container_id, from_location_id, to_location_id, notes, moved_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.entity_type,
        entry.entity_id,
        entry.from_container_id || null,
        entry.to_container_id || null,
        entry.from_location_id || null,
        entry.to_location_id || null,
        entry.notes || "",
        entry.moved_at || now()
      );
    }

    for (const entry of itemHistory) {
      db.prepare(
        `INSERT INTO item_history (id, workspace_id, item_id, event_type, from_quantity, to_quantity, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.item_id,
        entry.event_type,
        entry.from_quantity ?? null,
        entry.to_quantity ?? null,
        entry.notes || "",
        entry.created_at || now()
      );
    }

    for (const entry of itemEventLog) {
      db.prepare(
        `INSERT INTO item_event_log (id, workspace_id, item_id, event_type, from_text, to_text, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.item_id,
        entry.event_type,
        entry.from_text || "",
        entry.to_text || "",
        entry.notes || "",
        entry.created_at || now()
      );
    }

    for (const entry of containerEventLog) {
      db.prepare(
        `INSERT INTO container_event_log (id, workspace_id, container_id, event_type, from_text, to_text, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.container_id,
        entry.event_type,
        entry.from_text || "",
        entry.to_text || "",
        entry.notes || "",
        entry.created_at || now()
      );
    }

    for (const entry of containerActivityLog) {
      db.prepare(
        `INSERT INTO container_activity_log (id, workspace_id, container_id, item_id, item_name, action_type, from_quantity, to_quantity, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.container_id,
        entry.item_id || null,
        entry.item_name || "",
        entry.action_type,
        entry.from_quantity ?? null,
        entry.to_quantity ?? null,
        entry.notes || "",
        entry.created_at || now()
      );
    }

    for (const entry of dreamEntries) {
      db.prepare(
        `INSERT INTO dream_entries (
           id, workspace_id, user_id, dream_summary, restfulness_rating, wake_feeling, sleep_context_notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        workspaceIdValue,
        entry.user_id || entry.userId || user.id,
        entry.dream_summary || entry.dreamSummary || "",
        entry.restfulness_rating ?? entry.restfulnessRating ?? null,
        entry.wake_feeling || entry.wakeFeeling || "",
        entry.sleep_context_notes || entry.sleepContextNotes || "",
        entry.created_at || entry.createdAt || now(),
        entry.updated_at || entry.updatedAt || now()
      );
    }

    for (const whisky of auraWhiskies) {
      db.prepare(
        `INSERT INTO aura_whiskies (
           id, slug, name, canonical_name, distillery, expression, country, region, style, age_statement, abv, cask_type,
           price_usd, reference_notes, image_url, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        whisky.id,
        whisky.slug || slugify(buildAuraWhiskyDisplayName(whisky)),
        whisky.name || "",
        whisky.canonical_name || whisky.canonicalName || "",
        whisky.distillery || "",
        whisky.expression || "",
        whisky.country || "",
        whisky.region || "",
        whisky.style || "",
        whisky.age_statement || "",
        whisky.abv || "",
        whisky.cask_type || "",
        whisky.price_usd ?? whisky.priceUsd ?? null,
        whisky.reference_notes || "",
        whisky.image_url || "",
        whisky.created_at || whisky.createdAt || now(),
        whisky.updated_at || whisky.updatedAt || now()
      );
    }

    for (const notes of auraWhiskyUserNotes) {
     db.prepare(`
  INSERT INTO aura_entries (
    id,
    entity_id,
    category,
    user_id,
    rating,
    notes,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  entry.id,
  entry.whisky_id || entry.whiskyId,   // maps to entity_id
  'whisky',
  user.id,
  entry.rating || 0,                   // make sure rating exists
  entry.entry_text || "",              // maps to notes
  entry.created_at || entry.createdAt || now()
);
    }

    for (const entry of auraWhiskyEntries) {
      db.prepare(
        `INSERT INTO aura_whisky_entries (
           id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.id,
        entry.whisky_id || entry.whiskyId,
        workspaceIdValue,
        user.id,
        entry.entry_text || entry.entryText || "",
        entry.archived_at || entry.archivedAt || "",
        entry.created_at || entry.createdAt || now(),
        entry.updated_at || entry.updatedAt || now()
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function currentSession() {
  const ctx = requestContext();
  return ctx?.session || null;
}

function auraWhiskyCanonicalPath(row) {
  return `/aura/whiskies/${row.slug}-${row.id}`;
}

function buildAuraWhiskyDisplayName(row) {
  const canonicalName = String(row?.canonical_name || row?.canonicalName || "").trim();
  if (canonicalName) {
    return canonicalName;
  }
  const name = String(row?.name || "").trim();
  const expression = String(row?.expression || "").trim();
  return expression ? `${name} ${expression}`.trim() : name;
}

function mapAuraWhisky(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    canonicalName: row.canonical_name || "",
    distillery: row.distillery,
    expression: row.expression || "",
    displayName: buildAuraWhiskyDisplayName(row),
    country: row.country || "",
    region: row.region || "",
    style: row.style || "",
    ageStatement: row.age_statement || "",
    abv: row.abv || "",
    caskType: row.cask_type || "",
    priceUsd: row.price_usd == null || row.price_usd === "" ? null : Number(row.price_usd),
    referenceNotes: row.reference_notes || "",
    imageUrl: row.image_url || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    path: auraWhiskyCanonicalPath(row)
  };
}

function mapAuraWhiskyUserNotes(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    whiskyId: row.whisky_id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    tastingNotes: row.tasting_notes || "",
    personalNotes: row.personal_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAuraWhiskyEntry(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    whiskyId: row.whisky_id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    entryText: row.entry_text || "",
    archivedAt: row.archived_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function defaultAuraWhiskyUserNotes(whiskyId) {
  return {
    id: "",
    whiskyId,
    workspaceId: workspaceId(),
    userId: currentUserId(),
    tastingNotes: "",
    personalNotes: "",
    createdAt: "",
    updatedAt: ""
  };
}

function auraNormalizeText(value) {
  return String(value || "").trim();
}

function normalizeDreamRating(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const rating = Number.parseInt(String(value), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Restfulness rating must be between 1 and 5");
  }
  return rating;
}

function normalizeDreamLimit(value, fallback = 10) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const limit = Number.parseInt(String(value), 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    throw new Error("Limit must be between 1 and 50");
  }
  return limit;
}

function normalizeDreamDate(value, fieldName) {
  const date = String(value || "").trim();
  if (!date) {
    return "";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }
  return date;
}

function normalizeDreamWeekday(value) {
  const weekday = String(value || "").trim().toLowerCase();
  if (!weekday) {
    return "";
  }

  const allowed = new Set([
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ]);
  if (!allowed.has(weekday)) {
    throw new Error("Weekday must be a full day name like friday");
  }
  return weekday;
}

function normalizeDreamTimeZone(value) {
  const fallback = String(process.env.GPT_ACTIONS_TIMEZONE || "UTC").trim() || "UTC";
  const timeZone = String(value || "").trim() || fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return fallback;
  }
}

function dreamTimingDetails(timestamp, timeZone) {
  const instant = new Date(timestamp);
  if (Number.isNaN(instant.getTime())) {
    return {
      localDate: "",
      weekday: "",
      timeZone
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  }).formatToParts(instant);

  const lookup = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    localDate: `${lookup("year")}-${lookup("month")}-${lookup("day")}`,
    weekday: lookup("weekday").toLowerCase(),
    timeZone
  };
}

function mapDreamEntry(row, options = {}) {
  if (!row) {
    return null;
  }

  const timeZone = normalizeDreamTimeZone(options.timeZone || options.timezone);
  const timing = dreamTimingDetails(row.created_at, timeZone);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    dreamSummary: row.dream_summary || "",
    restfulnessRating: row.restfulness_rating == null ? null : Number(row.restfulness_rating),
    wakeFeeling: row.wake_feeling || "",
    sleepContextNotes: row.sleep_context_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    localDate: timing.localDate,
    weekday: timing.weekday,
    timeZone
  };
}

function listDreamEntryRows(workspaceIdValue = workspaceId(), userIdValue = currentUserId()) {
  if (!workspaceIdValue || !userIdValue) {
    return [];
  }

  return db.prepare(
    `SELECT id, workspace_id, user_id, dream_summary, restfulness_rating, wake_feeling, sleep_context_notes, created_at, updated_at
     FROM dream_entries
     WHERE workspace_id = ? AND user_id = ?
     ORDER BY created_at DESC, updated_at DESC, id DESC`
  ).all(workspaceIdValue, userIdValue);
}

function getAuraWhiskyRow(id) {
  return db.prepare(
    `SELECT id, slug, name, canonical_name, distillery, expression, country, region, style,
            age_statement, abv, cask_type, price_usd, reference_notes, image_url, created_at, updated_at
     FROM aura_whiskies
     WHERE id = ?`
  ).get(id);
}

function getAuraWhiskyUserNotesRow(whiskyId, workspaceIdValue = workspaceId(), userIdValue = currentUserId()) {
  if (!whiskyId || !workspaceIdValue || !userIdValue) {
    return null;
  }
  return db.prepare(
    `SELECT id, whisky_id, workspace_id, user_id, tasting_notes, personal_notes, created_at, updated_at
     FROM aura_whisky_user_notes
     WHERE whisky_id = ? AND workspace_id = ? AND user_id = ?
     LIMIT 1`
  ).get(whiskyId, workspaceIdValue, userIdValue);
}

function listAuraWhiskyEntryRows(whiskyId, workspaceIdValue = workspaceId(), userIdValue = currentUserId()) {
  if (!whiskyId || !workspaceIdValue || !userIdValue) {
    return [];
  }
  return db.prepare(
    `SELECT id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
     FROM aura_whisky_entries
     WHERE whisky_id = ? AND workspace_id = ? AND user_id = ?
       AND TRIM(COALESCE(archived_at, '')) = ''
     ORDER BY created_at DESC, updated_at DESC, id DESC`
  ).all(whiskyId, workspaceIdValue, userIdValue);
}

function getAuraWhiskyEntryRow(entryId, whiskyId, workspaceIdValue = workspaceId(), userIdValue = currentUserId()) {
  if (!entryId || !whiskyId || !workspaceIdValue || !userIdValue) {
    return null;
  }
  return db.prepare(
    `SELECT id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
     FROM aura_whisky_entries
     WHERE id = ? AND whisky_id = ? AND workspace_id = ? AND user_id = ?
     LIMIT 1`
  ).get(entryId, whiskyId, workspaceIdValue, userIdValue);
}

function listAllAuraWhiskyRows() {
  return db.prepare(
    `SELECT id, slug, name, canonical_name, distillery, expression, country, region, style,
            age_statement, abv, cask_type, price_usd, reference_notes, image_url, created_at, updated_at
     FROM aura_whiskies
     ORDER BY COALESCE(NULLIF(canonical_name, ''), name) COLLATE NOCASE, expression COLLATE NOCASE, distillery COLLATE NOCASE`
  ).all();
}

function listAuraWhiskyTouchedIds(workspaceIdValue = workspaceId(), userIdValue = currentUserId()) {
  if (!workspaceIdValue || !userIdValue) {
    return new Set();
  }
  const entryIds = db.prepare(
    `SELECT DISTINCT whisky_id
     FROM aura_whisky_entries
     WHERE workspace_id = ? AND user_id = ?
       AND TRIM(COALESCE(archived_at, '')) = ''`
  ).all(workspaceIdValue, userIdValue).map((row) => row.whisky_id);

  return new Set(entryIds.filter(Boolean));
}

function filterAuraWhiskyRows(rows, filters = {}) {
  const query = auraNormalizeText(filters.q).toLowerCase();
  const country = auraNormalizeText(filters.country);
  const region = auraNormalizeText(filters.region);
  const distillery = auraNormalizeText(filters.distillery);
  const whiskyId = auraNormalizeText(filters.whiskyId || filters.whisky);

  return rows.filter((row) => {
    const displayName = buildAuraWhiskyDisplayName(row).toLowerCase();
    const rowCountry = auraNormalizeText(row.country);
    const rowRegion = auraNormalizeText(row.region);
    const rowDistillery = auraNormalizeText(row.distillery);
    if (query) {
      const haystack = [
        row.name,
        row.canonical_name,
        row.expression,
        row.distillery,
        row.country,
        row.region,
        row.style,
        row.age_statement,
        row.cask_type,
        row.price_usd,
        row.reference_notes
      ].join(" ").toLowerCase();
      if (!haystack.includes(query) && !displayName.includes(query)) {
        return false;
      }
    }
    if (country && rowCountry !== country) {
      return false;
    }
    if (region && rowRegion !== region) {
      return false;
    }
    if (distillery && rowDistillery !== distillery) {
      return false;
    }
    if (whiskyId && row.id !== whiskyId) {
      return false;
    }
    return true;
  });
}

function uniqueSortedValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export function listAuraWhiskies(filters = {}) {
  const allRows = listAllAuraWhiskyRows();
  const view = auraNormalizeText(filters.view);
  const touchedIds = view === "mine" ? listAuraWhiskyTouchedIds() : null;
  const scopedRows = touchedIds ? allRows.filter((row) => touchedIds.has(row.id)) : allRows;
  const query = auraNormalizeText(filters.q);
  const country = auraNormalizeText(filters.country);
  const region = auraNormalizeText(filters.region);
  const distillery = auraNormalizeText(filters.distillery);
  const whiskyId = auraNormalizeText(filters.whiskyId || filters.whisky);

  const qRows = filterAuraWhiskyRows(scopedRows, { q: query });
  const countryRows = filterAuraWhiskyRows(qRows, { country });
  const regionRows = filterAuraWhiskyRows(qRows, { country, region });
  const distilleryRows = filterAuraWhiskyRows(qRows, { country, region, distillery });
  const results = filterAuraWhiskyRows(qRows, { country, region, distillery, whiskyId });

  return {
    query,
    selected: {
      country,
      region,
      distillery,
      whiskyId,
      view: view === "mine" ? "mine" : "search"
    },
    filters: {
      countries: uniqueSortedValues(qRows.map((row) => auraNormalizeText(row.country))),
      regions: uniqueSortedValues(countryRows.map((row) => auraNormalizeText(row.region))),
      distilleries: uniqueSortedValues(regionRows.map((row) => auraNormalizeText(row.distillery))),
      whiskies: distilleryRows.map((row) => ({
        id: row.id,
        label: buildAuraWhiskyDisplayName(row),
        distillery: row.distillery || "",
        path: auraWhiskyCanonicalPath(row)
      }))
    },
    whiskies: results.map(mapAuraWhisky)
  };
}

export function getAuraWhisky(id) {
  return mapAuraWhisky(getAuraWhiskyRow(id));
}

export function getAuraWhiskyFromRoute(slugId) {
  const id = extractRecordIdFromSlugId(slugId);
  return id ? getAuraWhisky(id) : null;
}

export function getAuraWhiskyDetail(id) {
  const whisky = getAuraWhisky(id);
  if (!whisky) {
    return null;
  }
  const myNotes = mapAuraWhiskyUserNotes(getAuraWhiskyUserNotesRow(id)) || defaultAuraWhiskyUserNotes(id);
  const entries = listAuraWhiskyEntryRows(id).map(mapAuraWhiskyEntry);
  return {
    whisky,
    myNotes,
    entries
  };
}

export function createAuraWhiskyEntry(whiskyId, input = {}) {
  const whisky = getAuraWhiskyRow(requireText(whiskyId, "Whisky is required"));
  if (!whisky) {
    throw new Error("Whisky not found");
  }
  const workspaceIdValue = workspaceId();
  const userIdValue = currentUserId();
  if (!userIdValue) {
    throw new Error("Please sign in.");
  }
  const entryText = auraNormalizeText(input.entryText);
  if (!entryText) {
    throw new Error("Please write something for this Aura entry.");
  }
  const timestamp = now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO aura_whisky_entries (
       id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, whisky.id, workspaceIdValue, userIdValue, entryText, "", timestamp, timestamp);
  return mapAuraWhiskyEntry(
    db.prepare(
      `SELECT id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
       FROM aura_whisky_entries
       WHERE id = ?`
    ).get(id)
  );
}

export function updateAuraWhiskyEntry(whiskyId, entryId, input = {}) {
  const whisky = getAuraWhiskyRow(requireText(whiskyId, "Whisky is required"));
  if (!whisky) {
    throw new Error("Whisky not found");
  }
  const workspaceIdValue = workspaceId();
  const userIdValue = currentUserId();
  if (!userIdValue) {
    throw new Error("Please sign in.");
  }
  const existing = getAuraWhiskyEntryRow(requireText(entryId, "Entry is required"), whisky.id, workspaceIdValue, userIdValue);
  if (!existing) {
    throw new Error("Aura entry not found");
  }
  const nextEntryText = Object.prototype.hasOwnProperty.call(input, "entryText")
    ? auraNormalizeText(input.entryText)
    : existing.entry_text;
  if (!nextEntryText) {
    throw new Error("Please write something for this Aura entry.");
  }
  const archiveRequested = Object.prototype.hasOwnProperty.call(input, "archived")
    ? Boolean(input.archived)
    : Boolean(String(existing.archived_at || "").trim());
  const timestamp = now();
  db.prepare(
    `UPDATE aura_whisky_entries
     SET entry_text = ?, archived_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(nextEntryText, archiveRequested ? timestamp : "", timestamp, existing.id);
  return mapAuraWhiskyEntry(
    db.prepare(
      `SELECT id, whisky_id, workspace_id, user_id, entry_text, archived_at, created_at, updated_at
       FROM aura_whisky_entries
       WHERE id = ?`
    ).get(existing.id)
  );
}

export function upsertAuraWhiskyUserNotes(whiskyId, input = {}) {
  const whisky = getAuraWhiskyRow(requireText(whiskyId, "Whisky is required"));
  if (!whisky) {
    throw new Error("Whisky not found");
  }
  const workspaceIdValue = workspaceId();
  const userIdValue = currentUserId();
  if (!userIdValue) {
    throw new Error("Please sign in.");
  }
  const timestamp = now();
  const existing = getAuraWhiskyUserNotesRow(whisky.id, workspaceIdValue, userIdValue);
  const tastingNotes = auraNormalizeText(input.tastingNotes);
  const personalNotes = auraNormalizeText(input.personalNotes);

  if (existing) {
    db.prepare(
      `UPDATE aura_whisky_user_notes
       SET tasting_notes = ?, personal_notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(tastingNotes, personalNotes, timestamp, existing.id);
  } else {
    db.prepare(
      `INSERT INTO aura_whisky_user_notes (
         id, whisky_id, workspace_id, user_id, tasting_notes, personal_notes, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), whisky.id, workspaceIdValue, userIdValue, tastingNotes, personalNotes, timestamp, timestamp);
  }

  return getAuraWhiskyDetail(whisky.id).myNotes;
}

export function createDreamEntry(input = {}) {
  const workspaceIdValue = workspaceId();
  const userIdValue = currentUserId();
  if (!userIdValue) {
    throw new Error("Please sign in.");
  }

  const dreamSummary = auraNormalizeText(input.dreamSummary ?? input.dream_summary);
  if (!dreamSummary) {
    throw new Error("Dream summary is required");
  }

  const timestamp = now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO dream_entries (
       id, workspace_id, user_id, dream_summary, restfulness_rating, wake_feeling, sleep_context_notes, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    workspaceIdValue,
    userIdValue,
    dreamSummary,
    normalizeDreamRating(input.restfulnessRating ?? input.restfulness_rating),
    auraNormalizeText(input.wakeFeeling ?? input.wake_feeling),
    auraNormalizeText(input.sleepContextNotes ?? input.sleep_context_notes),
    timestamp,
    timestamp
  );

  return mapDreamEntry(
    db.prepare(
      `SELECT id, workspace_id, user_id, dream_summary, restfulness_rating, wake_feeling, sleep_context_notes, created_at, updated_at
       FROM dream_entries
       WHERE id = ?`
    ).get(id)
  );
}

export function listRecentDreamEntries(options = {}) {
  const timeZone = normalizeDreamTimeZone(options.timeZone || options.timezone);
  const limit = normalizeDreamLimit(options.limit, 10);
  const rows = listDreamEntryRows()
    .slice(0, limit)
    .map((row) => mapDreamEntry(row, { timeZone }));

  return {
    total: rows.length,
    limit,
    timeZone,
    entries: rows
  };
}

export function searchDreamEntries(filters = {}) {
  const timeZone = normalizeDreamTimeZone(filters.timeZone || filters.timezone);
  const limit = normalizeDreamLimit(filters.limit, 20);
  const query = auraNormalizeText(filters.q || filters.query);
  const weekday = normalizeDreamWeekday(filters.weekday);
  const dateFrom = normalizeDreamDate(filters.dateFrom || filters.date_from, "dateFrom");
  const dateTo = normalizeDreamDate(filters.dateTo || filters.date_to, "dateTo");

  let entries = listDreamEntryRows().map((row) => mapDreamEntry(row, { timeZone }));

  if (query) {
    const needle = query.toLowerCase();
    entries = entries.filter((entry) => (
      [
        entry.dreamSummary,
        entry.wakeFeeling,
        entry.sleepContextNotes
      ].join(" ").toLowerCase().includes(needle)
    ));
  }

  if (weekday) {
    entries = entries.filter((entry) => entry.weekday === weekday);
  }

  if (dateFrom) {
    entries = entries.filter((entry) => entry.localDate >= dateFrom);
  }

  if (dateTo) {
    entries = entries.filter((entry) => entry.localDate <= dateTo);
  }

  const total = entries.length;
  entries = entries.slice(0, limit);

  return {
    query,
    weekday,
    dateFrom,
    dateTo,
    limit,
    total,
    timeZone,
    entries
  };
}

function findAuraWhiskyByStableKey(name, distillery) {
  const key = auraStableKey(name, distillery);
  return listAllAuraWhiskyRows().find((row) => auraStableKey(row.canonical_name || row.name, row.distillery) === key) || null;
}

function normalizeAuraWhiskyImportRow(row = {}) {
  const canonicalName = auraNormalizeText(row.canonical_name || row.name);
  const name = auraNormalizeText(row.name || canonicalName);
  const distillery = auraNormalizeText(row.distillery || row.brand);
  if (!name) {
    throw new Error("Each whisky row must include a name.");
  }
  if (!distillery) {
    throw new Error(`Whisky "${name}" is missing a distillery.`);
  }
  const expression = auraNormalizeText(row.expression);
  const displayName = buildAuraWhiskyDisplayName({
    canonical_name: canonicalName,
    name,
    expression
  });
  const priceUsdRaw = auraNormalizeText(row.price_usd);
  const priceUsd = priceUsdRaw ? Number(priceUsdRaw) : null;
  return {
    name,
    canonicalName: canonicalName || displayName,
    distillery,
    expression,
    country: auraNormalizeText(row.country),
    region: auraNormalizeText(row.region || row.location),
    style: auraNormalizeText(row.style),
    ageStatement: auraNormalizeText(row.age_statement),
    abv: auraNormalizeText(row.abv),
    caskType: auraNormalizeText(row.cask_type),
    referenceNotes: auraNormalizeText(row.reference_notes),
    priceUsd: Number.isFinite(priceUsd) ? priceUsd : null,
    imageUrl: auraNormalizeText(row.image_url),
    slug: slugify(displayName)
  };
}

function auraStableValue(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019']/g, "")
    .toLowerCase()
    .replace(/\b(\d+)\s*(?:years?\s*old|year\s*old|yo)\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function auraStableKey(name, distillery) {
  return `${auraStableValue(distillery)}::${auraStableValue(name)}`;
}

export function importAuraWhiskies(rows = [], options = {}) {
  const preparedRows = Array.isArray(rows) ? rows : [];
  const replace = Boolean(options.replace);
  const imported = [];
  const existingRows = replace ? [] : listAllAuraWhiskyRows();
  const existingByKey = new Map(
    existingRows.map((row) => [auraStableKey(row.canonical_name || row.name, row.distillery), row])
  );
  const importedKeys = new Set();

  db.exec("BEGIN");
  try {
    if (replace) {
      db.exec("DELETE FROM aura_whisky_user_notes;");
      db.exec("DELETE FROM aura_whiskies;");
    }

    for (const rawRow of preparedRows) {
      const row = normalizeAuraWhiskyImportRow(rawRow);
      const stableKey = auraStableKey(row.canonicalName || row.name, row.distillery);
      if (!stableKey || importedKeys.has(stableKey)) {
        continue;
      }
      importedKeys.add(stableKey);
      const timestamp = now();
      const existing = existingByKey.get(stableKey) || findAuraWhiskyByStableKey(row.canonicalName || row.name, row.distillery);
      if (existing) {
        db.prepare(
          `UPDATE aura_whiskies
           SET slug = ?, name = ?, canonical_name = ?, expression = ?, country = ?, region = ?, style = ?,
               age_statement = ?, abv = ?, cask_type = ?, price_usd = ?, reference_notes = ?, image_url = ?, updated_at = ?
           WHERE id = ?`
        ).run(
          row.slug,
          row.name,
          row.canonicalName,
          row.expression,
          row.country,
          row.region,
          row.style,
          row.ageStatement,
          row.abv,
          row.caskType,
          row.priceUsd,
          row.referenceNotes,
          row.imageUrl,
          timestamp,
          existing.id
        );
        existingByKey.set(stableKey, { ...existing, id: existing.id, name: row.name, canonical_name: row.canonicalName, distillery: row.distillery });
        imported.push(mapAuraWhisky(getAuraWhiskyRow(existing.id)));
        continue;
      }

      const id = randomUUID();
      db.prepare(
        `INSERT INTO aura_whiskies (
           id, slug, name, canonical_name, distillery, expression, country, region, style, age_statement, abv, cask_type,
           price_usd, reference_notes, image_url, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        row.slug,
        row.name,
        row.canonicalName,
        row.distillery,
        row.expression,
        row.country,
        row.region,
        row.style,
        row.ageStatement,
        row.abv,
        row.caskType,
        row.priceUsd,
        row.referenceNotes,
        row.imageUrl,
        timestamp,
        timestamp
      );
      existingByKey.set(stableKey, { id, name: row.name, canonical_name: row.canonicalName, distillery: row.distillery });
      imported.push(mapAuraWhisky(getAuraWhiskyRow(id)));
    }

    if (!replace) {
      for (const existing of existingRows) {
        const stableKey = auraStableKey(existing.canonical_name || existing.name, existing.distillery);
        if (importedKeys.has(stableKey)) {
          continue;
        }
        db.prepare("DELETE FROM aura_whiskies WHERE id = ?").run(existing.id);
      }
    }

    db.exec("COMMIT");
    return imported;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function allLocations() {
  return db.prepare(
    `SELECT l.id, l.workspace_id, l.name, l.description, l.notes, l.created_at, l.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = l.workspace_id AND t.entity_type = 'location' AND t.entity_id = l.id
              LIMIT 1
            ) AS tag_token,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = l.workspace_id AND t.entity_type = 'location' AND t.entity_id = l.id
              LIMIT 1
            ) AS tag_source,
            COUNT(c.id) AS container_count
     FROM locations l
     LEFT JOIN containers c ON c.workspace_id = l.workspace_id AND c.location_id = l.id
     WHERE l.workspace_id = ?
     GROUP BY l.id
     ORDER BY l.name`
  ).all(workspaceId());
}

function allContainers() {
  return db.prepare(
    `SELECT c.id, c.workspace_id, c.location_id, c.name, c.slug, c.type, c.description, c.notes, c.rfid_tag_id,
            c.image_file_name, c.image_stored_name, c.image_mime_type, c.image_size_bytes,
            c.created_at, c.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = c.workspace_id AND t.entity_type = 'container' AND t.entity_id = c.id
              LIMIT 1
            ) AS tag_token,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = c.workspace_id AND t.entity_type = 'container' AND t.entity_id = c.id
              LIMIT 1
            ) AS tag_source,
            l.name AS location_name
     FROM containers c
     LEFT JOIN locations l ON l.id = c.location_id
     WHERE c.workspace_id = ?
     ORDER BY c.name`
  ).all(workspaceId());
}

function allItems() {
  return db.prepare(
    `SELECT i.id, i.workspace_id, i.container_id, i.name, i.description, i.notes, i.quantity, i.created_at, i.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = i.workspace_id AND t.entity_type = 'item' AND t.entity_id = i.id
              LIMIT 1
            ) AS tag_token,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = i.workspace_id AND t.entity_type = 'item' AND t.entity_id = i.id
              LIMIT 1
            ) AS tag_source,
            c.name AS container_name, c.location_id, l.name AS location_name
     FROM items i
     JOIN containers c ON c.id = i.container_id
     LEFT JOIN locations l ON l.id = c.location_id
     WHERE i.workspace_id = ?
     ORDER BY i.name`
  ).all(workspaceId());
}

function getLocation(id) {
  return db.prepare(
    `SELECT l.id, l.workspace_id, l.name, l.description, l.notes, l.created_at, l.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = l.workspace_id AND t.entity_type = 'location' AND t.entity_id = l.id
              LIMIT 1
            ) AS tag_token
            ,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = l.workspace_id AND t.entity_type = 'location' AND t.entity_id = l.id
              LIMIT 1
            ) AS tag_source
     FROM locations l
     WHERE workspace_id = ? AND id = ?`
  ).get(workspaceId(), id);
}

export function getLocationForSync(id) {
  return getLocation(id);
}

function getContainer(id) {
  return db.prepare(
    `SELECT c.id, c.workspace_id, c.location_id, c.name, c.slug, c.type, c.description, c.notes, c.rfid_tag_id,
            c.image_file_name, c.image_stored_name, c.image_mime_type, c.image_size_bytes,
            c.created_at, c.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = c.workspace_id AND t.entity_type = 'container' AND t.entity_id = c.id
              LIMIT 1
            ) AS tag_token,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = c.workspace_id AND t.entity_type = 'container' AND t.entity_id = c.id
              LIMIT 1
            ) AS tag_source,
            l.name AS location_name
     FROM containers c
     LEFT JOIN locations l ON l.id = c.location_id
     WHERE c.workspace_id = ? AND c.id = ?`
  ).get(workspaceId(), id);
}

function getContainerBySlugId(slugId) {
  const id = extractRecordIdFromSlugId(slugId);
  return id ? getContainer(id) : null;
}

function extractRecordIdFromSlugId(slugId) {
  const value = String(slugId || "").trim();
  const match = value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match ? match[1] : value;
}

function getItem(id) {
  return db.prepare(
    `SELECT i.id, i.workspace_id, i.container_id, i.name, i.description, i.notes, i.quantity, i.created_at, i.updated_at,
            (
              SELECT t.token
              FROM tags t
              WHERE t.workspace_id = i.workspace_id AND t.entity_type = 'item' AND t.entity_id = i.id
              LIMIT 1
            ) AS tag_token,
            (
              SELECT t.source
              FROM tags t
              WHERE t.workspace_id = i.workspace_id AND t.entity_type = 'item' AND t.entity_id = i.id
              LIMIT 1
            ) AS tag_source,
            c.name AS container_name, c.location_id, l.name AS location_name
     FROM items i
     JOIN containers c ON c.id = i.container_id
     LEFT JOIN locations l ON l.id = c.location_id
     WHERE i.workspace_id = ? AND i.id = ?`
  ).get(workspaceId(), id);
}

function requireEntityType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!["location", "container", "item"].includes(type)) {
    throw new Error("Entity type must be location, container, or item");
  }
  return type;
}

function normalizeToken(value) {
  const token = String(value || "").trim();
  if (!token) {
    throw new Error("Token is required");
  }
  return token;
}

function getTagRow(token) {
  return db.prepare(
    `SELECT id, workspace_id, token, status, source, entity_type, entity_id, created_at, updated_at
     FROM tags
     WHERE token = ?`
  ).get(normalizeToken(token));
}

function getTagRowForEntity(entityType, entityId) {
  return db.prepare(
    `SELECT id, workspace_id, token, status, source, entity_type, entity_id, created_at, updated_at
     FROM tags
     WHERE workspace_id = ? AND entity_type = ? AND entity_id = ?
     LIMIT 1`
  ).get(workspaceId(), requireEntityType(entityType), requireText(entityId, "Entity is required"));
}

function normalizeTagSource(value, fallback = "generated") {
  const source = String(value || fallback).trim().toLowerCase();
  if (!["generated", "external"].includes(source)) {
    throw new Error("Tag source must be generated or external");
  }
  return source;
}

function getEntitySummary(entityType, entityId) {
  const type = requireEntityType(entityType);
  const id = requireText(entityId, "Entity is required");
  if (type === "location") {
    const location = getLocation(id);
    return location ? { id: location.id, name: location.name } : null;
  }
  if (type === "container") {
    const container = getContainer(id);
    return container ? { id: container.id, name: container.name, slug: container.slug } : null;
  }
  const item = getItem(id);
  return item ? { id: item.id, name: item.name, containerId: item.container_id } : null;
}

function assertEntityExists(entityType, entityId) {
  const entity = getEntitySummary(entityType, entityId);
  if (!entity) {
    throw new Error(`${requireEntityType(entityType)[0].toUpperCase()}${requireEntityType(entityType).slice(1)} not found`);
  }
  return entity;
}

function assertEntityHasNoOtherTag(entityType, entityId, ignoreToken = null) {
  const existing = getTagRowForEntity(entityType, entityId);
  if (existing && existing.token !== ignoreToken) {
    throw new Error("That record already has a tag assigned");
  }
}

function deleteTagsForEntity(entityType, entityIds) {
  const ids = Array.isArray(entityIds) ? entityIds : [entityIds];
  const type = requireEntityType(entityType);
  for (const entityId of ids) {
    if (!entityId) {
      continue;
    }
    db.prepare(
      "DELETE FROM tags WHERE workspace_id = ? AND entity_type = ? AND entity_id = ?"
    ).run(workspaceId(), type, entityId);
  }
}

function mapTag(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    token: row.token,
    status: row.status,
    source: row.source || "generated",
    entityType: row.entity_type || null,
    entityId: row.entity_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entity: row.status === "assigned" && row.entity_type && row.entity_id
      ? getEntitySummary(row.entity_type, row.entity_id)
      : null
  };
}

function insertMoveLog({
  entityType,
  entityId,
  fromContainerId = null,
  toContainerId = null,
  fromLocationId = null,
  toLocationId = null,
  notes = ""
}) {
  db.prepare(
    `INSERT INTO move_log (
       id, workspace_id, entity_type, entity_id,
       from_container_id, to_container_id,
       from_location_id, to_location_id,
       notes, moved_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    entityType,
    entityId,
    fromContainerId,
    toContainerId,
    fromLocationId,
    toLocationId,
    notes,
    now()
  );
}

function insertItemHistory({
  itemId,
  eventType,
  fromQuantity = null,
  toQuantity = null,
  notes = ""
}) {
  if (eventType === "quantity_changed") {
    const recent = db.prepare(
      `SELECT id, from_quantity, to_quantity, created_at
       FROM item_history
       WHERE workspace_id = ? AND item_id = ? AND event_type = 'quantity_changed'
       ORDER BY created_at DESC
       LIMIT 1`
    ).get(workspaceId(), itemId);

    if (recent && happenedWithinSeconds(recent.created_at, 60)) {
      db.prepare(
        `UPDATE item_history
         SET to_quantity = ?, notes = ?, created_at = ?
         WHERE workspace_id = ? AND id = ?`
      ).run(
        toQuantity,
        String(notes || "").trim(),
        now(),
        workspaceId(),
        recent.id
      );
      return;
    }
  }

  db.prepare(
    `INSERT INTO item_history (
       id, workspace_id, item_id, event_type, from_quantity, to_quantity, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    itemId,
    eventType,
    fromQuantity,
    toQuantity,
    String(notes || "").trim(),
    now()
  );
}

function insertItemEventLog({
  itemId,
  eventType,
  fromText = "",
  toText = "",
  notes = ""
}) {
  db.prepare(
    `INSERT INTO item_event_log (
       id, workspace_id, item_id, event_type, from_text, to_text, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    itemId,
    eventType,
    String(fromText || "").trim(),
    String(toText || "").trim(),
    String(notes || "").trim(),
    now()
  );
}

function insertContainerEventLog({
  containerId,
  eventType,
  fromText = "",
  toText = "",
  notes = ""
}) {
  db.prepare(
    `INSERT INTO container_event_log (
       id, workspace_id, container_id, event_type, from_text, to_text, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    containerId,
    eventType,
    String(fromText || "").trim(),
    String(toText || "").trim(),
    String(notes || "").trim(),
    now()
  );
}

export function recordItemImageEvent(itemId, fromText = "", toText = "", notes = "") {
  insertItemEventLog({
    itemId,
    eventType: "image_changed",
    fromText,
    toText,
    notes
  });
}

export function recordContainerImageEvent(containerId, fromText = "", toText = "", notes = "") {
  insertContainerEventLog({
    containerId,
    eventType: "image_changed",
    fromText,
    toText,
    notes
  });
}

function insertContainerActivityLog({
  containerId,
  itemId = null,
  itemName = "",
  actionType,
  fromQuantity = null,
  toQuantity = null,
  notes = ""
}) {
  if (actionType === "quantity_changed") {
    const recent = db.prepare(
      `SELECT id, from_quantity, to_quantity, created_at
       FROM container_activity_log
       WHERE workspace_id = ? AND container_id = ? AND item_id = ? AND action_type = 'quantity_changed'
       ORDER BY created_at DESC
       LIMIT 1`
    ).get(workspaceId(), containerId, itemId);

    if (recent && happenedWithinSeconds(recent.created_at, 60)) {
      db.prepare(
        `UPDATE container_activity_log
         SET item_name = ?, to_quantity = ?, notes = ?, created_at = ?
         WHERE workspace_id = ? AND id = ?`
      ).run(
        String(itemName || "").trim(),
        toQuantity,
        String(notes || "").trim(),
        now(),
        workspaceId(),
        recent.id
      );
      return;
    }
  }

  db.prepare(
    `INSERT INTO container_activity_log (
       id, workspace_id, container_id, item_id, item_name, action_type, from_quantity, to_quantity, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    containerId,
    itemId,
    String(itemName || "").trim(),
    actionType,
    fromQuantity,
    toQuantity,
    String(notes || "").trim(),
    now()
  );
}

function deletePhotosForItemIds(itemIds) {
  for (const itemId of itemIds) {
    const photos = db.prepare(
      "SELECT stored_name FROM photos WHERE workspace_id = ? AND item_id = ?"
    ).all(workspaceId(), itemId);

    for (const photo of photos) {
      const target = path.join(uploadsDir, photo.stored_name);
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }

    db.prepare("DELETE FROM photos WHERE workspace_id = ? AND item_id = ?").run(workspaceId(), itemId);
  }
}

function deleteContainerImage(container) {
  const storedName = String(container?.image_stored_name || "").trim();
  if (!storedName) {
    return;
  }
  const target = path.join(uploadsDir, storedName);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

export function getBootstrap(selectedContainerId = null) {
  const session = currentSession();
  if (!session) {
    return {
      authenticated: false
    };
  }
  return {
    authenticated: true,
    currentUser: session.user,
    workspace: session.workspace,
    workspaces: session.workspaces,
    locations: allLocations(),
    containers: allContainers(),
    items: allItems(),
    selectedContainerId
  };
}

export function getTag(token) {
  return mapTag(getTagRow(token));
}

export function createTag(input = {}) {
  const token = normalizeToken(input.token || randomUUID());
  if (getTagRow(token)) {
    throw new Error("That tag already exists");
  }
  const source = normalizeTagSource(input.source, input.token ? "external" : "generated");

  const entityType = input.entityType ? requireEntityType(input.entityType) : null;
  const entityId = input.entityId ? requireText(input.entityId, "Entity is required") : null;
  if ((entityType && !entityId) || (!entityType && entityId)) {
    throw new Error("Entity type and entity id must be provided together");
  }

  if (entityType && entityId) {
    assertEntityExists(entityType, entityId);
    assertEntityHasNoOtherTag(entityType, entityId);
  }

  const timestamp = now();
  db.prepare(
    `INSERT INTO tags (
       id, workspace_id, token, status, source, entity_type, entity_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    workspaceId(),
    token,
    entityType ? "assigned" : "unassigned",
    source,
    entityType,
    entityId,
    timestamp,
    timestamp
  );

  return getTag(token);
}

export function assignTag(token, input = {}) {
  const cleanToken = normalizeToken(token);
  const entityType = requireEntityType(input.entityType);
  const entityId = requireText(input.entityId, "Entity is required");
  assertEntityExists(entityType, entityId);
  assertEntityHasNoOtherTag(entityType, entityId, cleanToken);

  const existing = getTagRow(cleanToken);
  if (!existing) {
    return createTag({ token: cleanToken, entityType, entityId, source: input.source || "external" });
  }

  if (existing.status === "assigned" && (existing.entity_type !== entityType || existing.entity_id !== entityId)) {
    throw new Error("That tag is already assigned");
  }

  const nextSource = normalizeTagSource(existing.source || input.source, "external");
  db.prepare(
    `UPDATE tags
     SET status = 'assigned', source = ?, entity_type = ?, entity_id = ?, updated_at = ?
     WHERE workspace_id = ? AND token = ?`
  ).run(
    nextSource,
    entityType,
    entityId,
    now(),
    workspaceId(),
    cleanToken
  );

  return getTag(cleanToken);
}

export function createLocation(input) {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO locations (id, workspace_id, name, description, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    workspaceId(),
    requireText(input.name, "Location name is required"),
    String(input.description || "").trim(),
    String(input.notes || "").trim(),
    timestamp,
    timestamp
  );

  return getLocation(id);
}

export function updateLocation(id, input) {
  const location = getLocation(id);
  if (!location) {
    throw new Error("Location not found");
  }

  db.prepare(
    `UPDATE locations
     SET name = ?, description = ?, notes = ?, updated_at = ?
     WHERE workspace_id = ? AND id = ?`
  ).run(
    requireText(input.name, "Location name is required"),
    String(input.description || "").trim(),
    String(input.notes || "").trim(),
    now(),
    workspaceId(),
    id
  );

  return getLocation(id);
}

export function deleteLocation(id) {
  const location = getLocation(id);
  if (!location) {
    throw new Error("Location not found");
  }

  const containerCount = db.prepare(
    "SELECT COUNT(*) AS count FROM containers WHERE workspace_id = ? AND location_id = ?"
  ).get(workspaceId(), id).count;

  if (containerCount > 0) {
    throw new Error(`Cannot delete "${location.name}" because ${containerCount} container${containerCount === 1 ? "" : "s"} still use it.`);
  }

  deleteTagsForEntity("location", id);
  db.prepare("DELETE FROM locations WHERE workspace_id = ? AND id = ?").run(workspaceId(), id);
  return { id };
}

export function createContainer(input) {
  const locationId = input.locationId || null;
  if (locationId && !getLocation(locationId)) {
    throw new Error("Location not found");
  }

  const requestedName = String(input.name || "").trim();
  const name = requestedName || nextAutoContainerName();
  assertUniqueContainerName(name);

  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO containers (
       id, workspace_id, location_id, name, slug, type, description, notes, rfid_tag_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    workspaceId(),
    locationId,
    name,
    slugify(name),
    requireText(input.type || "Container", "Container type is required"),
    String(input.description || "").trim(),
    String(input.notes || "").trim(),
    String(input.rfidTagId || "").trim(),
    timestamp,
    timestamp
  );

  return getContainer(id);
}

function nextAutoContainerName() {
  const rows = db.prepare(
    `SELECT name
     FROM containers
     WHERE workspace_id = ?`
  ).all(workspaceId());

  let highest = 0;
  for (const row of rows) {
    const match = /^arca\s+(\d+)$/i.exec(String(row.name || "").trim());
    if (match) {
      highest = Math.max(highest, Number.parseInt(match[1], 10) || 0);
    }
  }

  return `Arca ${highest + 1}`;
}

export function updateContainer(id, input) {
  const container = getContainer(id);
  if (!container) {
    throw new Error("Container not found");
  }

  const locationId = input.locationId || null;
  if (locationId && !getLocation(locationId)) {
    throw new Error("Location not found");
  }

  const name = requireText(input.name, "Container name is required");
  assertUniqueContainerName(name, id);
  const nextNotes = String(input.notes || "").trim();
  const timestamp = now();
  db.prepare(
    `UPDATE containers
     SET location_id = ?, name = ?, slug = ?, type = ?, description = ?, notes = ?, rfid_tag_id = ?, parent_container_id = NULL, updated_at = ?
     WHERE workspace_id = ? AND id = ?`
  ).run(
    locationId,
    name,
    slugify(name),
    requireText(input.type || "Container", "Container type is required"),
    String(input.description || "").trim(),
    nextNotes,
    String(input.rfidTagId || "").trim(),
    timestamp,
    workspaceId(),
    id
  );

  if (name !== container.name) {
    insertContainerEventLog({
      containerId: id,
      eventType: "renamed",
      fromText: container.name,
      toText: name
    });
  }

  if ((locationId || null) !== (container.location_id || null)) {
    insertMoveLog({
      entityType: "container",
      entityId: id,
      fromLocationId: container.location_id || null,
      toLocationId: locationId || null
    });
  }

  return getContainer(id);
}

function assertUniqueContainerName(name, ignoreId = null) {
  const duplicate = db.prepare(
    `SELECT id, name
     FROM containers
     WHERE workspace_id = ?
       AND lower(trim(name)) = lower(trim(?))
       AND (? IS NULL OR id <> ?)
     LIMIT 1`
  ).get(workspaceId(), name, ignoreId, ignoreId);

  if (duplicate) {
    throw new Error(`A container named "${duplicate.name}" already exists. Choose a different name.`);
  }
}

export function moveContainer(id, locationId, notes = "") {
  const container = getContainer(id);
  if (!container) {
    throw new Error("Container not found");
  }

  if (locationId && !getLocation(locationId)) {
    throw new Error("Location not found");
  }

  db.prepare(
    "UPDATE containers SET location_id = ?, parent_container_id = NULL, updated_at = ? WHERE workspace_id = ? AND id = ?"
  ).run(locationId || null, now(), workspaceId(), id);

  insertMoveLog({
    entityType: "container",
    entityId: id,
    fromLocationId: container.location_id || null,
    toLocationId: locationId || null,
    notes
  });

  return getContainer(id);
}

export function deleteContainer(id) {
  const container = getContainer(id);
  if (!container) {
    throw new Error("Container not found");
  }

  const childCount = db.prepare(
    "SELECT COUNT(*) AS count FROM containers WHERE workspace_id = ? AND parent_container_id = ?"
  ).get(workspaceId(), id).count;

  if (childCount > 0) {
    throw new Error(`Cannot delete "${container.name}" because ${childCount} child container${childCount === 1 ? "" : "s"} still reference it.`);
  }

  const itemIds = db.prepare(
    "SELECT id FROM items WHERE workspace_id = ? AND container_id = ?"
  ).all(workspaceId(), id).map((row) => row.id);

  deleteContainerImage(container);
  deletePhotosForItemIds(itemIds);
  deleteTagsForEntity("item", itemIds);
  deleteTagsForEntity("container", id);
  db.prepare("DELETE FROM items WHERE workspace_id = ? AND container_id = ?").run(workspaceId(), id);
  db.prepare("DELETE FROM containers WHERE workspace_id = ? AND id = ?").run(workspaceId(), id);
  return { id };
}

export function getContainerDetail(id) {
  const container = getContainer(id);
  if (!container) {
    return null;
  }

  return {
    container,
    tag: mapTag(getTagRowForEntity("container", id)),
    items: db.prepare(
      `SELECT i.id, i.workspace_id, i.container_id, i.name, i.description, i.notes, i.quantity, i.created_at, i.updated_at,
              (
                SELECT p.stored_name
                FROM photos p
                WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
                ORDER BY p.created_at ASC
                LIMIT 1
              ) AS thumbnail_stored_name
       FROM items i
       WHERE i.workspace_id = ? AND i.container_id = ?
       ORDER BY i.name`
    ).all(workspaceId(), id),
    moveLog: db.prepare(
      `SELECT ml.id, ml.entity_type, ml.entity_id, ml.from_location_id, ml.to_location_id, ml.notes, ml.moved_at,
              fl.name AS from_location_name,
              tl.name AS to_location_name
       FROM move_log ml
       LEFT JOIN locations fl ON fl.id = ml.from_location_id
       LEFT JOIN locations tl ON tl.id = ml.to_location_id
       WHERE ml.workspace_id = ? AND ml.entity_type = 'container' AND ml.entity_id = ?
       ORDER BY moved_at DESC
       LIMIT 20`
    ).all(workspaceId(), id),
    eventLog: db.prepare(
      `SELECT id, event_type, from_text, to_text, notes, created_at
       FROM container_event_log
       WHERE workspace_id = ? AND container_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    ).all(workspaceId(), id),
    itemActivity: db.prepare(
      `SELECT id, item_id, item_name, action_type, from_quantity, to_quantity, notes, created_at
       FROM container_activity_log
       WHERE workspace_id = ? AND container_id = ?
       ORDER BY created_at DESC
       LIMIT 40`
    ).all(workspaceId(), id)
  };
}

export function createItem(input) {
  const containerId = requireText(input.containerId, "Container is required");
  if (!getContainer(containerId)) {
    throw new Error("Container not found");
  }

  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO items (id, workspace_id, container_id, name, description, notes, quantity, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    workspaceId(),
    containerId,
    requireText(input.name, "Item name is required"),
    String(input.description || "").trim(),
    String(input.notes || "").trim(),
    normalizeQuantity(input.quantity),
    timestamp,
    timestamp
  );

  insertContainerActivityLog({
    containerId,
    itemId: id,
    itemName: requireText(input.name, "Item name is required"),
    actionType: "item_added"
  });

  return getItem(id);
}

export function updateItem(id, input) {
  const item = getItem(id);
  if (!item) {
    throw new Error("Item not found");
  }

  const containerId = requireText(input.containerId || item.container_id, "Container is required");
  if (!getContainer(containerId)) {
    throw new Error("Container not found");
  }
  const nextName = requireText(input.name, "Item name is required");
  const nextQuantity = normalizeQuantity(input.quantity);
  const nextNotes = String(input.notes || "").trim();

  db.prepare(
    `UPDATE items
     SET container_id = ?, name = ?, description = ?, notes = ?, quantity = ?, updated_at = ?
     WHERE workspace_id = ? AND id = ?`
  ).run(
    containerId,
    nextName,
    String(input.description || "").trim(),
    nextNotes,
    nextQuantity,
    now(),
    workspaceId(),
    id
  );

  if (nextName !== item.name) {
    insertItemEventLog({
      itemId: id,
      eventType: "renamed",
      fromText: item.name,
      toText: nextName
    });
  }

  if (nextQuantity !== item.quantity) {
    insertItemHistory({
      itemId: id,
      eventType: "quantity_changed",
      fromQuantity: item.quantity,
      toQuantity: nextQuantity
    });
  }

  if (containerId !== item.container_id) {
    insertMoveLog({
      entityType: "item",
      entityId: id,
      fromContainerId: item.container_id,
      toContainerId: containerId,
      notes: ""
    });

    insertContainerActivityLog({
      containerId: item.container_id,
      itemId: id,
      itemName: nextName,
      actionType: "item_removed"
    });

    insertContainerActivityLog({
      containerId,
      itemId: id,
      itemName: nextName,
      actionType: "item_added"
    });
  }

  return getItem(id);
}

export function moveItem(id, destinationId, notes = "") {
  const item = getItem(id);
  if (!item) {
    throw new Error("Item not found");
  }

  const destination = getContainer(destinationId);
  if (!destination) {
    throw new Error("Destination container not found");
  }

  db.prepare(
    "UPDATE items SET container_id = ?, updated_at = ? WHERE workspace_id = ? AND id = ?"
  ).run(destinationId, now(), workspaceId(), id);

  insertMoveLog({
    entityType: "item",
    entityId: id,
    fromContainerId: item.container_id,
    toContainerId: destinationId,
    notes
  });

  insertContainerActivityLog({
    containerId: item.container_id,
    itemId: id,
    itemName: item.name,
    actionType: "item_removed",
    notes
  });

  insertContainerActivityLog({
    containerId: destinationId,
    itemId: id,
    itemName: item.name,
    actionType: "item_added",
    notes
  });

  return getItem(id);
}

export function deleteItem(id) {
  const item = getItem(id);
  if (!item) {
    throw new Error("Item not found");
  }

  insertContainerActivityLog({
    containerId: item.container_id,
    itemId: id,
    itemName: item.name,
    actionType: "item_removed",
    notes: "Item deleted"
  });

  deletePhotosForItemIds([id]);
  deleteTagsForEntity("item", id);
  db.prepare("DELETE FROM items WHERE workspace_id = ? AND id = ?").run(workspaceId(), id);
  return { id };
}

export function getItemDetail(id) {
  const item = getItem(id);
  if (!item) {
    return null;
  }

  return {
    item,
    tag: mapTag(getTagRowForEntity("item", id)),
    photos: db.prepare(
      `SELECT id, file_name, stored_name, mime_type, size_bytes, caption, created_at
       FROM photos
       WHERE workspace_id = ? AND item_id = ?
       ORDER BY created_at DESC`
    ).all(workspaceId(), id),
    moveLog: db.prepare(
      `SELECT ml.id, ml.entity_type, ml.entity_id, ml.from_container_id, ml.to_container_id, ml.notes, ml.moved_at,
              fc.name AS from_container_name,
              tc.name AS to_container_name
       FROM move_log ml
       LEFT JOIN containers fc ON fc.id = ml.from_container_id
       LEFT JOIN containers tc ON tc.id = ml.to_container_id
       WHERE ml.workspace_id = ? AND ml.entity_type = 'item' AND ml.entity_id = ?
       ORDER BY moved_at DESC
       LIMIT 20`
    ).all(workspaceId(), id),
    quantityLog: db.prepare(
      `SELECT id, event_type, from_quantity, to_quantity, notes, created_at
       FROM item_history
       WHERE workspace_id = ? AND item_id = ? AND event_type = 'quantity_changed'
       ORDER BY created_at DESC
       LIMIT 20`
    ).all(workspaceId(), id),
    eventLog: db.prepare(
      `SELECT id, event_type, from_text, to_text, notes, created_at
       FROM item_event_log
       WHERE workspace_id = ? AND item_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    ).all(workspaceId(), id)
  };
}

export function saveItemPhoto(itemId, file) {
  const item = getItem(itemId);
  if (!item) {
    throw new Error("Item not found");
  }

  const previousPhoto = db.prepare(
    `SELECT id, file_name, stored_name
     FROM photos
     WHERE workspace_id = ? AND item_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).get(workspaceId(), itemId);

  // Version 1 keeps a single primary image per item, so new uploads replace the old one.
  deletePhotosForItemIds([itemId]);

  const extension = path.extname(file.fileName || "").toLowerCase() || ".bin";
  const photoId = randomUUID();
  const storedName = `${photoId}${extension}`;
  const target = path.join(uploadsDir, storedName);
  fs.writeFileSync(target, file.buffer);

  db.prepare(
    `INSERT INTO photos (id, workspace_id, item_id, file_name, stored_name, mime_type, size_bytes, caption, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    photoId,
    workspaceId(),
    itemId,
    file.fileName,
    storedName,
    file.mimeType,
    file.buffer.byteLength,
    String(file.caption || "").trim(),
    now()
  );

  insertItemEventLog({
    itemId,
    eventType: "image_changed",
    fromText: String(previousPhoto?.file_name || "").trim(),
    toText: String(file.fileName || "").trim()
  });

  return db.prepare(
    "SELECT id, file_name, stored_name, mime_type, size_bytes, caption, created_at FROM photos WHERE id = ?"
  ).get(photoId);
}

export function saveContainerPhoto(containerId, file) {
  const container = getContainer(containerId);
  if (!container) {
    throw new Error("Container not found");
  }

  const previousFileName = String(container.image_file_name || "").trim();

  deleteContainerImage(container);

  const extension = path.extname(file.fileName || "").toLowerCase() || ".bin";
  const storedName = `${randomUUID()}${extension}`;
  const target = path.join(uploadsDir, storedName);
  fs.writeFileSync(target, file.buffer);

  db.prepare(
    `UPDATE containers
     SET image_file_name = ?, image_stored_name = ?, image_mime_type = ?, image_size_bytes = ?, updated_at = ?
     WHERE workspace_id = ? AND id = ?`
  ).run(
    file.fileName,
    storedName,
    file.mimeType,
    file.buffer.byteLength,
    now(),
    workspaceId(),
    containerId
  );

  insertContainerEventLog({
    containerId,
    eventType: "image_changed",
    fromText: previousFileName,
    toText: String(file.fileName || "").trim()
  });

  return getContainer(containerId);
}

export function getPhotoFile(storedName) {
  const cleanName = String(storedName || "").trim();
  if (!cleanName) {
    return null;
  }
  const photoExists = db.prepare(
    `SELECT stored_name
     FROM photos
     WHERE workspace_id = ? AND stored_name = ?
     LIMIT 1`
  ).get(workspaceId(), cleanName);
  const containerImageExists = db.prepare(
    `SELECT image_stored_name
     FROM containers
     WHERE workspace_id = ? AND image_stored_name = ?
     LIMIT 1`
  ).get(workspaceId(), cleanName);
  if (!photoExists && !containerImageExists) {
    return null;
  }
  const target = path.join(uploadsDir, cleanName);
  return fs.existsSync(target) ? target : null;
}

export function searchRecords(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return { query: "", locations: [], containers: [], items: [] };
  }

  const term = `%${cleanQuery}%`;

  return {
    query: cleanQuery,
    locations: db.prepare(
      `SELECT id, name, description, notes
       FROM locations
       WHERE workspace_id = ? AND (name LIKE ? OR description LIKE ? OR notes LIKE ?)
       ORDER BY name
       LIMIT 50`
    ).all(workspaceId(), term, term, term),
    containers: db.prepare(
      `SELECT c.id, c.name, c.slug, c.type, c.location_id, l.name AS location_name, c.description, c.notes,
              COUNT(i.id) AS item_count
       FROM containers c
       LEFT JOIN locations l ON l.id = c.location_id
       LEFT JOIN items i ON i.container_id = c.id
       WHERE c.workspace_id = ? AND (c.name LIKE ? OR c.description LIKE ? OR c.notes LIKE ? OR c.rfid_tag_id LIKE ?)
       GROUP BY c.id
       ORDER BY c.name
       LIMIT 50`
    ).all(workspaceId(), term, term, term, term),
    items: db.prepare(
      `SELECT i.id, i.name, i.quantity, i.description, i.notes, i.container_id, c.name AS container_name, l.name AS location_name
       FROM items i
       JOIN containers c ON c.id = i.container_id
       LEFT JOIN locations l ON l.id = c.location_id
       WHERE i.workspace_id = ? AND (i.name LIKE ? OR i.description LIKE ? OR i.notes LIKE ?)
       ORDER BY i.name
       LIMIT 50`
    ).all(workspaceId(), term, term, term)
  };
}

export function searchTethrRecords(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return {
      query: "",
      counts: { aura: 0, arca: 0, terra: 0 },
      branches: [],
      aura: { total: 0, items: [] },
      arca: { total: 0, locations: [], containers: [], items: [] },
      terra: { total: 0, items: [] }
    };
  }

  const arca = searchRecords(cleanQuery);
  const aura = listAuraWhiskies({ q: cleanQuery });

  const arcaLocations = arca.locations.map((location) => ({
    id: location.id,
    kind: "location",
    name: location.name,
    summary: "Place",
    path: `/arca?location=${location.id}`
  }));

  const arcaContainers = arca.containers.map((container) => ({
    id: container.id,
    kind: "container",
    name: container.name,
    summary: [
      container.location_name || "No Place",
      `${container.item_count ?? 0} item${(container.item_count ?? 0) === 1 ? "" : "s"}`
    ].filter(Boolean).join(" · "),
    path: `/containers/${container.slug}-${container.id}`
  }));

  const arcaItems = arca.items.map((item) => ({
    id: item.id,
    kind: "item",
    name: item.name,
    summary: [
      item.container_name || "Unknown container",
      `Qty ${item.quantity}`,
      item.location_name || ""
    ].filter(Boolean).join(" · "),
    path: `/arca?item=${item.id}`
  }));

  const auraItems = (aura.whiskies || []).map((item) => ({
    id: item.id,
    kind: "aura",
    name: item.displayName,
    summary: [
      item.distillery || "",
      item.country || "",
      item.region || "",
      item.style || ""
    ].filter(Boolean).join(" · "),
    path: item.path
  }));

  const arcaTotal = arcaLocations.length + arcaContainers.length + arcaItems.length;
  const auraTotal = auraItems.length;

  const branches = [
    auraTotal ? { key: "aura", label: "Aura", count: auraTotal } : null,
    arcaTotal ? { key: "arca", label: "Arca", count: arcaTotal } : null
  ].filter(Boolean);

  return {
    query: cleanQuery,
    counts: {
      aura: auraTotal,
      arca: arcaTotal,
      terra: 0
    },
    branches,
    aura: {
      total: auraTotal,
      items: auraItems
    },
    arca: {
      total: arcaTotal,
      locations: arcaLocations,
      containers: arcaContainers,
      items: arcaItems
    },
    terra: {
      total: 0,
      items: []
    }
  };
}

export function getContainerFromRoute(slugId) {
  return getContainerBySlugId(slugId);
}

function requireText(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }
  return text;
}

function normalizeQuantity(value) {
  const number = Number.parseInt(String(value || "1"), 10);
  if (!Number.isFinite(number) || number < 1) {
    throw new Error("Quantity must be at least 1");
  }
  return number;
}
