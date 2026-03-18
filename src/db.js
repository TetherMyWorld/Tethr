import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { slugify } from "./domain.js";

const dataDir = path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbFile = path.join(dataDir, "tethrarca.sqlite");

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
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_locations_workspace ON locations (workspace_id, name);
  CREATE INDEX IF NOT EXISTS idx_containers_workspace_location ON containers (workspace_id, location_id, name);
  CREATE INDEX IF NOT EXISTS idx_items_workspace_container ON items (workspace_id, container_id, name);
  CREATE INDEX IF NOT EXISTS idx_item_history_item_created ON item_history (workspace_id, item_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_item_event_log_item_created ON item_event_log (workspace_id, item_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_container_event_log_container_created ON container_event_log (workspace_id, container_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_container_activity_log_container_created ON container_activity_log (workspace_id, container_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tags_workspace_token ON tags (workspace_id, token);
  CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags (workspace_id, entity_type, entity_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_unique ON workspace_members (workspace_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id, workspace_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id, expires_at);
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

function currentSession() {
  const ctx = requestContext();
  return ctx?.session || null;
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
