import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { slugify } from "./domain.js";

const projectRoot = process.cwd();
const seedDir = path.join(projectRoot, "seed");
const seedStateFile = path.join(seedDir, "state.json");
const seedUploadsDir = path.join(seedDir, "uploads");
const runningOnVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const useBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localRoot = useBlobStorage
  ? path.join(os.tmpdir(), "tethrarca")
  : path.join(projectRoot, "data");
const localStateFile = path.join(localRoot, "state.local.json");
const localUploadsDir = path.join(localRoot, "uploads");
const blobStatePath = "system/state.json";
const blobUploadPrefix = "uploads";
const blobAccess = "private";

if (runningOnVercel && !useBlobStorage) {
  console.warn("BLOB_READ_WRITE_TOKEN is not set. Falling back to temporary storage under /tmp.");
}

function now() {
  return new Date().toISOString();
}

function defaultWorkspace() {
  const timestamp = now();
  return {
    id: randomUUID(),
    name: "Personal Inventory",
    created_at: timestamp,
    updated_at: timestamp
  };
}

function createEmptyState() {
  return {
    version: 1,
    exported_at: null,
    workspace: defaultWorkspace(),
    locations: [],
    containers: [],
    items: [],
    photos: [],
    move_log: [],
    item_history: [],
    item_event_log: [],
    container_event_log: [],
    container_activity_log: [],
    tags: []
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => ({ ...entry })) : [];
}

function normalizeState(value = {}) {
  const base = createEmptyState();
  const workspace = value.workspace
    ? { ...value.workspace }
    : value.workspaces?.[0]
      ? { ...value.workspaces[0] }
      : base.workspace;

  return {
    version: 1,
    exported_at: value.exported_at || null,
    workspace,
    locations: normalizeArray(value.locations),
    containers: normalizeArray(value.containers),
    items: normalizeArray(value.items),
    photos: normalizeArray(value.photos),
    move_log: normalizeArray(value.move_log),
    item_history: normalizeArray(value.item_history),
    item_event_log: normalizeArray(value.item_event_log),
    container_event_log: normalizeArray(value.container_event_log),
    container_activity_log: normalizeArray(value.container_activity_log),
    tags: normalizeArray(value.tags)
  };
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readSeedState() {
  if (await fileExists(seedStateFile)) {
    return normalizeState(JSON.parse(await fs.readFile(seedStateFile, "utf8")));
  }
  return createEmptyState();
}

function workspaceId(state) {
  if (!state.workspace) {
    state.workspace = defaultWorkspace();
  }
  return state.workspace.id;
}

function referencedStoredNames(state) {
  const names = new Set();

  for (const container of state.containers) {
    const storedName = String(container.image_stored_name || "").trim();
    if (storedName) {
      names.add(storedName);
    }
  }

  for (const photo of state.photos) {
    const storedName = String(photo.stored_name || "").trim();
    if (storedName) {
      names.add(storedName);
    }
  }

  return [...names];
}

async function ensureLocalStorage() {
  await fs.mkdir(localUploadsDir, { recursive: true });

  if (!(await fileExists(localStateFile))) {
    const state = await readSeedState();
    await fs.writeFile(localStateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");

    for (const storedName of referencedStoredNames(state)) {
      const source = path.join(seedUploadsDir, storedName);
      const target = path.join(localUploadsDir, storedName);
      if ((await fileExists(source)) && !(await fileExists(target))) {
        await fs.copyFile(source, target);
      }
    }
  }
}

async function blobSdk() {
  return import("@vercel/blob");
}

function blobUploadPath(storedName) {
  return `${blobUploadPrefix}/${storedName}`;
}

async function streamToText(stream) {
  if (!stream) {
    return "";
  }
  return new Response(stream).text();
}

async function saveBlobState(state, etag = null) {
  const { put } = await blobSdk();
  const result = await put(blobStatePath, `${JSON.stringify(state, null, 2)}\n`, {
    access: blobAccess,
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(etag ? { ifMatch: etag } : {})
  });
  return result.etag;
}

function isBlobConflict(error) {
  const message = String(error?.message || "");
  return message.includes("Precondition") || message.includes("ifMatch");
}

function lookupStoredContentType(state, storedName) {
  const photo = state.photos.find((entry) => entry.stored_name === storedName);
  if (photo?.mime_type) {
    return photo.mime_type;
  }

  const container = state.containers.find((entry) => entry.image_stored_name === storedName);
  return container?.image_mime_type || "application/octet-stream";
}

async function seedBlobAssets(state) {
  const { put } = await blobSdk();

  for (const storedName of referencedStoredNames(state)) {
    const source = path.join(seedUploadsDir, storedName);
    if (!(await fileExists(source))) {
      continue;
    }

    await put(blobUploadPath(storedName), await fs.readFile(source), {
      access: blobAccess,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: lookupStoredContentType(state, storedName) || undefined
    });
  }
}

async function loadBlobStateBundle() {
  const { get } = await blobSdk();
  const result = await get(blobStatePath, { access: blobAccess });

  if (!result) {
    const seeded = await readSeedState();
    await seedBlobAssets(seeded);
    const etag = await saveBlobState(seeded);
    return { state: seeded, etag };
  }

  return {
    state: normalizeState(JSON.parse(await streamToText(result.stream))),
    etag: result.blob.etag
  };
}

async function loadLocalStateBundle() {
  await ensureLocalStorage();
  return {
    state: normalizeState(JSON.parse(await fs.readFile(localStateFile, "utf8"))),
    etag: null
  };
}

async function loadStateBundle() {
  return useBlobStorage ? loadBlobStateBundle() : loadLocalStateBundle();
}

async function saveState(state, etag = null) {
  if (useBlobStorage) {
    return saveBlobState(state, etag);
  }

  await ensureLocalStorage();
  await fs.writeFile(localStateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return null;
}

async function withStateWrite(mutator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { state, etag } = await loadStateBundle();
    const draft = structuredClone(state);
    const value = await mutator(draft);

    try {
      await saveState(draft, etag);
      return value;
    } catch (error) {
      if (useBlobStorage && isBlobConflict(error) && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not save changes");
}

async function saveStoredAsset(storedName, file) {
  if (useBlobStorage) {
    const { put } = await blobSdk();
    await put(blobUploadPath(storedName), file.buffer, {
      access: blobAccess,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.mimeType || undefined
    });
    return;
  }

  await ensureLocalStorage();
  await fs.writeFile(path.join(localUploadsDir, storedName), file.buffer);
}

async function deleteStoredAsset(storedName) {
  if (!storedName) {
    return;
  }

  if (useBlobStorage) {
    const { del } = await blobSdk();
    try {
      await del(blobUploadPath(storedName));
    } catch {
      // Ignore missing files so delete flows stay idempotent.
    }
    return;
  }

  const target = path.join(localUploadsDir, storedName);
  if (await fileExists(target)) {
    await fs.unlink(target);
  }
}

async function findLocalStoredAsset(storedName) {
  const localTarget = path.join(localUploadsDir, storedName);
  if (await fileExists(localTarget)) {
    return localTarget;
  }

  const seedTarget = path.join(seedUploadsDir, storedName);
  if (await fileExists(seedTarget)) {
    return seedTarget;
  }

  return null;
}

function textSearch(haystacks, needle) {
  const normalizedNeedle = needle.toLowerCase();
  return haystacks.some((value) => String(value || "").toLowerCase().includes(normalizedNeedle));
}

function byName(left, right) {
  return String(left.name || "").localeCompare(String(right.name || ""));
}

function requireText(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }
  return text;
}

function normalizeQuantity(value) {
  const quantity = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }
  return quantity;
}

function happenedWithinSeconds(timestamp, seconds) {
  if (!timestamp) {
    return false;
  }

  const millis = new Date(timestamp).getTime();
  if (Number.isNaN(millis)) {
    return false;
  }

  return Date.now() - millis <= seconds * 1000;
}

function extractRecordIdFromSlugId(slugId) {
  const value = String(slugId || "").trim();
  const match = value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match ? match[1] : value;
}

function getLocationRecord(state, id) {
  return state.locations.find((entry) => entry.workspace_id === workspaceId(state) && entry.id === id) || null;
}

function getContainerRecord(state, id) {
  return state.containers.find((entry) => entry.workspace_id === workspaceId(state) && entry.id === id) || null;
}

function getItemRecord(state, id) {
  return state.items.find((entry) => entry.workspace_id === workspaceId(state) && entry.id === id) || null;
}

function getLocation(state, id) {
  const location = getLocationRecord(state, id);
  if (!location) {
    return null;
  }

  const tag = state.tags.find((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "location" && entry.entity_id === id);
  return {
    ...location,
    tag_token: tag?.token || null
  };
}

function getContainer(state, id) {
  const container = getContainerRecord(state, id);
  if (!container) {
    return null;
  }

  return {
    ...container,
    location_name: getLocationRecord(state, container.location_id)?.name || null
  };
}

function getContainerBySlugId(state, slugId) {
  const id = extractRecordIdFromSlugId(slugId);
  return id ? getContainer(state, id) : null;
}

function getItem(state, id) {
  const item = getItemRecord(state, id);
  if (!item) {
    return null;
  }

  const container = getContainerRecord(state, item.container_id);
  const location = container ? getLocationRecord(state, container.location_id) : null;
  return {
    ...item,
    container_name: container?.name || null,
    location_id: container?.location_id || null,
    location_name: location?.name || null
  };
}

function allLocations(state) {
  return state.locations
    .filter((entry) => entry.workspace_id === workspaceId(state))
    .map((location) => ({
      ...location,
      tag_token: state.tags.find((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "location" && entry.entity_id === location.id)?.token || null,
      container_count: state.containers.filter((entry) => entry.workspace_id === workspaceId(state) && entry.location_id === location.id).length
    }))
    .sort(byName);
}

function allContainers(state) {
  return state.containers
    .filter((entry) => entry.workspace_id === workspaceId(state))
    .map((container) => ({
      ...container,
      tag_token: state.tags.find((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "container" && entry.entity_id === container.id)?.token || null,
      location_name: getLocationRecord(state, container.location_id)?.name || null
    }))
    .sort(byName);
}

function allItems(state) {
  return state.items
    .filter((entry) => entry.workspace_id === workspaceId(state))
    .map((item) => {
      const container = getContainerRecord(state, item.container_id);
      const location = container ? getLocationRecord(state, container.location_id) : null;
      return {
        ...item,
        tag_token: state.tags.find((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "item" && entry.entity_id === item.id)?.token || null,
        container_name: container?.name || null,
        location_id: container?.location_id || null,
        location_name: location?.name || null
      };
    })
    .sort(byName);
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

function getTagRow(state, token) {
  return state.tags.find((entry) => entry.token === normalizeToken(token)) || null;
}

function getTagRowForEntity(state, entityType, entityId) {
  const type = requireEntityType(entityType);
  const id = requireText(entityId, "Entity is required");
  return state.tags.find((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === type && entry.entity_id === id) || null;
}

function getEntitySummary(state, entityType, entityId) {
  const type = requireEntityType(entityType);
  const id = requireText(entityId, "Entity is required");

  if (type === "location") {
    const location = getLocation(state, id);
    return location ? { id: location.id, name: location.name } : null;
  }

  if (type === "container") {
    const container = getContainer(state, id);
    return container ? { id: container.id, name: container.name, slug: container.slug } : null;
  }

  const item = getItem(state, id);
  return item ? { id: item.id, name: item.name, containerId: item.container_id } : null;
}

function mapTag(state, row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    token: row.token,
    status: row.status,
    entityType: row.entity_type || null,
    entityId: row.entity_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entity: row.status === "assigned" && row.entity_type && row.entity_id
      ? getEntitySummary(state, row.entity_type, row.entity_id)
      : null
  };
}

function assertEntityExists(state, entityType, entityId) {
  const entity = getEntitySummary(state, entityType, entityId);
  if (!entity) {
    const type = requireEntityType(entityType);
    throw new Error(`${type[0].toUpperCase()}${type.slice(1)} not found`);
  }
  return entity;
}

function assertEntityHasNoOtherTag(state, entityType, entityId, ignoreToken = null) {
  const existing = getTagRowForEntity(state, entityType, entityId);
  if (existing && existing.token !== ignoreToken) {
    throw new Error("That record already has a tag assigned");
  }
}

function deleteTagsForEntity(state, entityType, entityIds) {
  const ids = new Set((Array.isArray(entityIds) ? entityIds : [entityIds]).filter(Boolean));
  const type = requireEntityType(entityType);
  state.tags = state.tags.filter((entry) => !(entry.workspace_id === workspaceId(state) && entry.entity_type === type && ids.has(entry.entity_id)));
}

function insertMoveLog(state, {
  entityType,
  entityId,
  fromContainerId = null,
  toContainerId = null,
  fromLocationId = null,
  toLocationId = null,
  notes = ""
}) {
  state.move_log.push({
    id: randomUUID(),
    workspace_id: workspaceId(state),
    entity_type: entityType,
    entity_id: entityId,
    from_container_id: fromContainerId,
    to_container_id: toContainerId,
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    notes: String(notes || "").trim(),
    moved_at: now()
  });
}

function insertItemHistory(state, {
  itemId,
  eventType,
  fromQuantity = null,
  toQuantity = null,
  notes = ""
}) {
  if (eventType === "quantity_changed") {
    const recent = [...state.item_history]
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.item_id === itemId && entry.event_type === "quantity_changed")
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))[0];

    if (recent && happenedWithinSeconds(recent.created_at, 60)) {
      recent.to_quantity = toQuantity;
      recent.notes = String(notes || "").trim();
      recent.created_at = now();
      return;
    }
  }

  state.item_history.push({
    id: randomUUID(),
    workspace_id: workspaceId(state),
    item_id: itemId,
    event_type: eventType,
    from_quantity: fromQuantity,
    to_quantity: toQuantity,
    notes: String(notes || "").trim(),
    created_at: now()
  });
}

function insertItemEventLog(state, {
  itemId,
  eventType,
  fromText = "",
  toText = "",
  notes = ""
}) {
  state.item_event_log.push({
    id: randomUUID(),
    workspace_id: workspaceId(state),
    item_id: itemId,
    event_type: eventType,
    from_text: String(fromText || "").trim(),
    to_text: String(toText || "").trim(),
    notes: String(notes || "").trim(),
    created_at: now()
  });
}

function insertContainerEventLog(state, {
  containerId,
  eventType,
  fromText = "",
  toText = "",
  notes = ""
}) {
  state.container_event_log.push({
    id: randomUUID(),
    workspace_id: workspaceId(state),
    container_id: containerId,
    event_type: eventType,
    from_text: String(fromText || "").trim(),
    to_text: String(toText || "").trim(),
    notes: String(notes || "").trim(),
    created_at: now()
  });
}

function insertContainerActivityLog(state, {
  containerId,
  itemId = null,
  itemName = "",
  actionType,
  fromQuantity = null,
  toQuantity = null,
  notes = ""
}) {
  if (actionType === "quantity_changed") {
    const recent = [...state.container_activity_log]
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.container_id === containerId && entry.item_id === itemId && entry.action_type === "quantity_changed")
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))[0];

    if (recent && happenedWithinSeconds(recent.created_at, 60)) {
      recent.item_name = String(itemName || "").trim();
      recent.to_quantity = toQuantity;
      recent.notes = String(notes || "").trim();
      recent.created_at = now();
      return;
    }
  }

  state.container_activity_log.push({
    id: randomUUID(),
    workspace_id: workspaceId(state),
    container_id: containerId,
    item_id: itemId,
    item_name: String(itemName || "").trim(),
    action_type: actionType,
    from_quantity: fromQuantity,
    to_quantity: toQuantity,
    notes: String(notes || "").trim(),
    created_at: now()
  });
}

async function deletePhotosForItemIds(state, itemIds) {
  const ids = new Set(itemIds);
  const toDelete = state.photos.filter((entry) => entry.workspace_id === workspaceId(state) && ids.has(entry.item_id));

  for (const photo of toDelete) {
    await deleteStoredAsset(photo.stored_name);
  }

  state.photos = state.photos.filter((entry) => !(entry.workspace_id === workspaceId(state) && ids.has(entry.item_id)));
}

async function deleteContainerImage(state, container) {
  const storedName = String(container?.image_stored_name || "").trim();
  if (!storedName) {
    return;
  }

  await deleteStoredAsset(storedName);
}

function nextAutoContainerName(state) {
  let highest = 0;

  for (const container of state.containers) {
    const match = /^arca\s+(\d+)$/i.exec(String(container.name || "").trim());
    if (match) {
      highest = Math.max(highest, Number.parseInt(match[1], 10) || 0);
    }
  }

  return `Arca ${highest + 1}`;
}

function assertUniqueContainerName(state, name, ignoreId = null) {
  const duplicate = state.containers.find((entry) => (
    entry.workspace_id === workspaceId(state)
    && entry.id !== ignoreId
    && String(entry.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase()
  ));

  if (duplicate) {
    throw new Error(`A container named "${duplicate.name}" already exists. Choose a different name.`);
  }
}

export async function getBootstrap(selectedContainerId = null) {
  const { state } = await loadStateBundle();
  return {
    workspace: { ...state.workspace },
    locations: allLocations(state),
    containers: allContainers(state),
    items: allItems(state),
    selectedContainerId
  };
}

export async function getTag(token) {
  const { state } = await loadStateBundle();
  return mapTag(state, getTagRow(state, token));
}

export async function createTag(input = {}) {
  return withStateWrite(async (state) => {
    const token = normalizeToken(input.token || randomUUID());
    if (getTagRow(state, token)) {
      throw new Error("That tag already exists");
    }

    const entityType = input.entityType ? requireEntityType(input.entityType) : null;
    const entityId = input.entityId ? requireText(input.entityId, "Entity is required") : null;
    if ((entityType && !entityId) || (!entityType && entityId)) {
      throw new Error("Entity type and entity id must be provided together");
    }

    if (entityType && entityId) {
      assertEntityExists(state, entityType, entityId);
      assertEntityHasNoOtherTag(state, entityType, entityId);
    }

    const timestamp = now();
    state.tags.push({
      id: randomUUID(),
      workspace_id: workspaceId(state),
      token,
      status: entityType ? "assigned" : "unassigned",
      entity_type: entityType,
      entity_id: entityId,
      created_at: timestamp,
      updated_at: timestamp
    });

    return mapTag(state, getTagRow(state, token));
  });
}

export async function assignTag(token, input = {}) {
  return withStateWrite(async (state) => {
    const cleanToken = normalizeToken(token);
    const entityType = requireEntityType(input.entityType);
    const entityId = requireText(input.entityId, "Entity is required");
    assertEntityExists(state, entityType, entityId);
    assertEntityHasNoOtherTag(state, entityType, entityId, cleanToken);

    const existing = getTagRow(state, cleanToken);
    if (!existing) {
      const timestamp = now();
      const created = {
        id: randomUUID(),
        workspace_id: workspaceId(state),
        token: cleanToken,
        status: "assigned",
        entity_type: entityType,
        entity_id: entityId,
        created_at: timestamp,
        updated_at: timestamp
      };
      state.tags.push(created);
      return mapTag(state, created);
    }

    if (existing.status === "assigned" && (existing.entity_type !== entityType || existing.entity_id !== entityId)) {
      throw new Error("That tag is already assigned");
    }

    existing.status = "assigned";
    existing.entity_type = entityType;
    existing.entity_id = entityId;
    existing.updated_at = now();

    return mapTag(state, existing);
  });
}

export async function createLocation(input) {
  return withStateWrite(async (state) => {
    const timestamp = now();
    const location = {
      id: randomUUID(),
      workspace_id: workspaceId(state),
      name: requireText(input.name, "Location name is required"),
      description: String(input.description || "").trim(),
      notes: String(input.notes || "").trim(),
      created_at: timestamp,
      updated_at: timestamp
    };

    state.locations.push(location);
    return getLocation(state, location.id);
  });
}

export async function updateLocation(id, input) {
  return withStateWrite(async (state) => {
    const location = getLocationRecord(state, id);
    if (!location) {
      throw new Error("Location not found");
    }

    location.name = requireText(input.name, "Location name is required");
    location.description = String(input.description || "").trim();
    location.notes = String(input.notes || "").trim();
    location.updated_at = now();

    return getLocation(state, id);
  });
}

export async function deleteLocation(id) {
  return withStateWrite(async (state) => {
    const location = getLocationRecord(state, id);
    if (!location) {
      throw new Error("Location not found");
    }

    const containerCount = state.containers.filter((entry) => entry.workspace_id === workspaceId(state) && entry.location_id === id).length;
    if (containerCount > 0) {
      throw new Error(`Cannot delete "${location.name}" because ${containerCount} container${containerCount === 1 ? "" : "s"} still use it.`);
    }

    deleteTagsForEntity(state, "location", id);
    state.locations = state.locations.filter((entry) => !(entry.workspace_id === workspaceId(state) && entry.id === id));
    return { id };
  });
}

export async function createContainer(input) {
  return withStateWrite(async (state) => {
    const locationId = input.locationId || null;
    if (locationId && !getLocationRecord(state, locationId)) {
      throw new Error("Location not found");
    }

    const requestedName = String(input.name || "").trim();
    const name = requestedName || nextAutoContainerName(state);
    assertUniqueContainerName(state, name);

    const timestamp = now();
    const container = {
      id: randomUUID(),
      workspace_id: workspaceId(state),
      parent_container_id: null,
      location_id: locationId,
      name,
      slug: slugify(name),
      type: requireText(input.type || "Container", "Container type is required"),
      description: String(input.description || "").trim(),
      notes: String(input.notes || "").trim(),
      rfid_tag_id: String(input.rfidTagId || "").trim(),
      image_file_name: "",
      image_stored_name: "",
      image_mime_type: "",
      image_size_bytes: 0,
      created_at: timestamp,
      updated_at: timestamp
    };

    state.containers.push(container);
    return getContainer(state, container.id);
  });
}

export async function updateContainer(id, input) {
  return withStateWrite(async (state) => {
    const container = getContainerRecord(state, id);
    if (!container) {
      throw new Error("Container not found");
    }

    const locationId = input.locationId || null;
    if (locationId && !getLocationRecord(state, locationId)) {
      throw new Error("Location not found");
    }

    const nextName = requireText(input.name, "Container name is required");
    assertUniqueContainerName(state, nextName, id);
    const previousName = container.name;
    const previousLocationId = container.location_id || null;

    container.location_id = locationId;
    container.name = nextName;
    container.slug = slugify(nextName);
    container.type = requireText(input.type || "Container", "Container type is required");
    container.description = String(input.description || "").trim();
    container.notes = String(input.notes || "").trim();
    container.rfid_tag_id = String(input.rfidTagId || "").trim();
    container.parent_container_id = null;
    container.updated_at = now();

    if (nextName !== previousName) {
      insertContainerEventLog(state, {
        containerId: id,
        eventType: "renamed",
        fromText: previousName,
        toText: nextName
      });
    }

    if ((locationId || null) !== previousLocationId) {
      insertMoveLog(state, {
        entityType: "container",
        entityId: id,
        fromLocationId: previousLocationId,
        toLocationId: locationId || null
      });
    }

    return getContainer(state, id);
  });
}

export async function moveContainer(id, locationId, notes = "") {
  return withStateWrite(async (state) => {
    const container = getContainerRecord(state, id);
    if (!container) {
      throw new Error("Container not found");
    }

    if (locationId && !getLocationRecord(state, locationId)) {
      throw new Error("Location not found");
    }

    const previousLocationId = container.location_id || null;
    container.location_id = locationId || null;
    container.parent_container_id = null;
    container.updated_at = now();

    insertMoveLog(state, {
      entityType: "container",
      entityId: id,
      fromLocationId: previousLocationId,
      toLocationId: locationId || null,
      notes
    });

    return getContainer(state, id);
  });
}

export async function deleteContainer(id) {
  return withStateWrite(async (state) => {
    const container = getContainerRecord(state, id);
    if (!container) {
      throw new Error("Container not found");
    }

    const childCount = state.containers.filter((entry) => entry.workspace_id === workspaceId(state) && entry.parent_container_id === id).length;
    if (childCount > 0) {
      throw new Error(`Cannot delete "${container.name}" because ${childCount} child container${childCount === 1 ? "" : "s"} still reference it.`);
    }

    const itemIds = state.items
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.container_id === id)
      .map((entry) => entry.id);

    await deleteContainerImage(state, container);
    await deletePhotosForItemIds(state, itemIds);
    deleteTagsForEntity(state, "item", itemIds);
    deleteTagsForEntity(state, "container", id);

    state.item_history = state.item_history.filter((entry) => !itemIds.includes(entry.item_id));
    state.item_event_log = state.item_event_log.filter((entry) => !itemIds.includes(entry.item_id));
    state.container_event_log = state.container_event_log.filter((entry) => entry.container_id !== id);
    state.container_activity_log = state.container_activity_log.filter((entry) => entry.container_id !== id && !itemIds.includes(entry.item_id));
    state.move_log = state.move_log.filter((entry) => !(entry.entity_type === "container" && entry.entity_id === id) && !(entry.entity_type === "item" && itemIds.includes(entry.entity_id)));
    state.items = state.items.filter((entry) => !(entry.workspace_id === workspaceId(state) && entry.container_id === id));
    state.containers = state.containers.filter((entry) => !(entry.workspace_id === workspaceId(state) && entry.id === id));

    return { id };
  });
}

export async function getContainerDetail(id) {
  const { state } = await loadStateBundle();
  const container = getContainer(state, id);
  if (!container) {
    return null;
  }

  return {
    container,
    tag: mapTag(state, getTagRowForEntity(state, "container", id)),
    items: state.items
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.container_id === id)
      .map((item) => ({
        ...item,
        thumbnail_stored_name: [...state.photos]
          .filter((photo) => photo.workspace_id === workspaceId(state) && photo.item_id === item.id)
          .sort((left, right) => String(left.created_at).localeCompare(String(right.created_at)))[0]?.stored_name || null
      }))
      .sort(byName),
    moveLog: state.move_log
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "container" && entry.entity_id === id)
      .sort((left, right) => String(right.moved_at).localeCompare(String(left.moved_at)))
      .slice(0, 20)
      .map((entry) => ({
        ...entry,
        from_location_name: getLocationRecord(state, entry.from_location_id)?.name || null,
        to_location_name: getLocationRecord(state, entry.to_location_id)?.name || null
      })),
    eventLog: state.container_event_log
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.container_id === id)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, 20),
    itemActivity: state.container_activity_log
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.container_id === id)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, 40)
  };
}

export async function createItem(input) {
  return withStateWrite(async (state) => {
    const containerId = requireText(input.containerId, "Container is required");
    if (!getContainerRecord(state, containerId)) {
      throw new Error("Container not found");
    }

    const timestamp = now();
    const item = {
      id: randomUUID(),
      workspace_id: workspaceId(state),
      container_id: containerId,
      name: requireText(input.name, "Item name is required"),
      description: String(input.description || "").trim(),
      notes: String(input.notes || "").trim(),
      quantity: normalizeQuantity(input.quantity),
      created_at: timestamp,
      updated_at: timestamp
    };

    state.items.push(item);
    insertContainerActivityLog(state, {
      containerId,
      itemId: item.id,
      itemName: item.name,
      actionType: "item_added"
    });

    return getItem(state, item.id);
  });
}

export async function updateItem(id, input) {
  return withStateWrite(async (state) => {
    const item = getItemRecord(state, id);
    if (!item) {
      throw new Error("Item not found");
    }

    const containerId = requireText(input.containerId || item.container_id, "Container is required");
    if (!getContainerRecord(state, containerId)) {
      throw new Error("Container not found");
    }

    const nextName = requireText(input.name, "Item name is required");
    const nextQuantity = normalizeQuantity(input.quantity);
    const previousName = item.name;
    const previousQuantity = item.quantity;
    const previousContainerId = item.container_id;

    item.container_id = containerId;
    item.name = nextName;
    item.description = String(input.description || "").trim();
    item.notes = String(input.notes || "").trim();
    item.quantity = nextQuantity;
    item.updated_at = now();

    if (nextName !== previousName) {
      insertItemEventLog(state, {
        itemId: id,
        eventType: "renamed",
        fromText: previousName,
        toText: nextName
      });
    }

    if (nextQuantity !== previousQuantity) {
      insertItemHistory(state, {
        itemId: id,
        eventType: "quantity_changed",
        fromQuantity: previousQuantity,
        toQuantity: nextQuantity
      });
    }

    if (containerId !== previousContainerId) {
      insertMoveLog(state, {
        entityType: "item",
        entityId: id,
        fromContainerId: previousContainerId,
        toContainerId: containerId,
        notes: ""
      });

      insertContainerActivityLog(state, {
        containerId: previousContainerId,
        itemId: id,
        itemName: nextName,
        actionType: "item_removed"
      });

      insertContainerActivityLog(state, {
        containerId,
        itemId: id,
        itemName: nextName,
        actionType: "item_added"
      });
    }

    return getItem(state, id);
  });
}

export async function moveItem(id, destinationId, notes = "") {
  return withStateWrite(async (state) => {
    const item = getItemRecord(state, id);
    if (!item) {
      throw new Error("Item not found");
    }

    if (!getContainerRecord(state, destinationId)) {
      throw new Error("Destination container not found");
    }

    const previousContainerId = item.container_id;
    item.container_id = destinationId;
    item.updated_at = now();

    insertMoveLog(state, {
      entityType: "item",
      entityId: id,
      fromContainerId: previousContainerId,
      toContainerId: destinationId,
      notes
    });

    insertContainerActivityLog(state, {
      containerId: previousContainerId,
      itemId: id,
      itemName: item.name,
      actionType: "item_removed",
      notes
    });

    insertContainerActivityLog(state, {
      containerId: destinationId,
      itemId: id,
      itemName: item.name,
      actionType: "item_added",
      notes
    });

    return getItem(state, id);
  });
}

export async function deleteItem(id) {
  return withStateWrite(async (state) => {
    const item = getItemRecord(state, id);
    if (!item) {
      throw new Error("Item not found");
    }

    insertContainerActivityLog(state, {
      containerId: item.container_id,
      itemId: id,
      itemName: item.name,
      actionType: "item_removed",
      notes: "Item deleted"
    });

    await deletePhotosForItemIds(state, [id]);
    deleteTagsForEntity(state, "item", id);
    state.item_history = state.item_history.filter((entry) => entry.item_id !== id);
    state.item_event_log = state.item_event_log.filter((entry) => entry.item_id !== id);
    state.move_log = state.move_log.filter((entry) => !(entry.entity_type === "item" && entry.entity_id === id));
    state.items = state.items.filter((entry) => !(entry.workspace_id === workspaceId(state) && entry.id === id));

    return { id };
  });
}

export async function getItemDetail(id) {
  const { state } = await loadStateBundle();
  const item = getItem(state, id);
  if (!item) {
    return null;
  }

  return {
    item,
    tag: mapTag(state, getTagRowForEntity(state, "item", id)),
    photos: state.photos
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.item_id === id)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))),
    moveLog: state.move_log
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.entity_type === "item" && entry.entity_id === id)
      .sort((left, right) => String(right.moved_at).localeCompare(String(left.moved_at)))
      .slice(0, 20)
      .map((entry) => ({
        ...entry,
        from_container_name: getContainerRecord(state, entry.from_container_id)?.name || null,
        to_container_name: getContainerRecord(state, entry.to_container_id)?.name || null
      })),
    quantityLog: state.item_history
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.item_id === id && entry.event_type === "quantity_changed")
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, 20),
    eventLog: state.item_event_log
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.item_id === id)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, 20)
  };
}

export async function saveItemPhoto(itemId, file) {
  return withStateWrite(async (state) => {
    const item = getItemRecord(state, itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    const previousPhoto = [...state.photos]
      .filter((entry) => entry.workspace_id === workspaceId(state) && entry.item_id === itemId)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))[0];

    await deletePhotosForItemIds(state, [itemId]);

    const extension = path.extname(file.fileName || "").toLowerCase() || ".bin";
    const photoId = randomUUID();
    const storedName = `${photoId}${extension}`;
    await saveStoredAsset(storedName, file);

    const photo = {
      id: photoId,
      workspace_id: workspaceId(state),
      item_id: itemId,
      file_name: file.fileName,
      stored_name: storedName,
      mime_type: file.mimeType,
      size_bytes: file.buffer.byteLength,
      caption: String(file.caption || "").trim(),
      created_at: now()
    };

    state.photos.push(photo);
    insertItemEventLog(state, {
      itemId,
      eventType: "image_changed",
      fromText: String(previousPhoto?.file_name || "").trim(),
      toText: String(file.fileName || "").trim()
    });

    return { ...photo };
  });
}

export async function saveContainerPhoto(containerId, file) {
  return withStateWrite(async (state) => {
    const container = getContainerRecord(state, containerId);
    if (!container) {
      throw new Error("Container not found");
    }

    const previousFileName = String(container.image_file_name || "").trim();
    await deleteContainerImage(state, container);

    const extension = path.extname(file.fileName || "").toLowerCase() || ".bin";
    const storedName = `${randomUUID()}${extension}`;
    await saveStoredAsset(storedName, file);

    container.image_file_name = file.fileName;
    container.image_stored_name = storedName;
    container.image_mime_type = file.mimeType;
    container.image_size_bytes = file.buffer.byteLength;
    container.updated_at = now();

    insertContainerEventLog(state, {
      containerId,
      eventType: "image_changed",
      fromText: previousFileName,
      toText: String(file.fileName || "").trim()
    });

    return getContainer(state, containerId);
  });
}

export async function getPhotoAsset(storedName) {
  const cleanStoredName = String(storedName || "").trim();
  if (!cleanStoredName) {
    return null;
  }

  const { state } = await loadStateBundle();

  if (useBlobStorage) {
    const { get } = await blobSdk();
    const result = await get(blobUploadPath(cleanStoredName), { access: blobAccess });
    if (!result || result.statusCode !== 200) {
      return null;
    }

    return {
      contentType: result.blob.contentType || lookupStoredContentType(state, cleanStoredName),
      body: result.stream,
      isWebStream: true
    };
  }

  const target = await findLocalStoredAsset(cleanStoredName);
  if (!target) {
    return null;
  }

  return {
    contentType: lookupStoredContentType(state, cleanStoredName),
    body: await fs.readFile(target),
    isWebStream: false
  };
}

export async function searchRecords(query) {
  const { state } = await loadStateBundle();
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return { query: "", locations: [], containers: [], items: [] };
  }

  return {
    query: cleanQuery,
    locations: allLocations(state)
      .filter((entry) => textSearch([entry.name, entry.description, entry.notes], cleanQuery))
      .slice(0, 50)
      .map(({ id, name, description, notes }) => ({ id, name, description, notes })),
    containers: allContainers(state)
      .filter((entry) => textSearch([entry.name, entry.description, entry.notes, entry.rfid_tag_id], cleanQuery))
      .slice(0, 50)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        type: entry.type,
        location_id: entry.location_id,
        location_name: entry.location_name,
        description: entry.description,
        notes: entry.notes,
        item_count: state.items.filter((item) => item.workspace_id === workspaceId(state) && item.container_id === entry.id).length
      })),
    items: allItems(state)
      .filter((entry) => textSearch([entry.name, entry.description, entry.notes], cleanQuery))
      .slice(0, 50)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        description: entry.description,
        notes: entry.notes,
        container_id: entry.container_id,
        container_name: entry.container_name,
        location_name: entry.location_name
      }))
  };
}

export async function getContainerFromRoute(slugId) {
  const { state } = await loadStateBundle();
  return getContainerBySlugId(state, slugId);
}
