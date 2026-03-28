import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  assignTag,
  createAuraWhiskyEntry,
  updateAuraWhiskyEntry,
  createContainer,
  createItem,
  createLocation,
  createTag,
  deleteContainer,
  deleteItem,
  deleteLocation,
  getAuraWhiskyDetail,
  getBootstrap,
  getContainerDetail,
  getContainerFromRoute,
  getLocationForSync,
  getItemDetail,
  getPhotoFile,
  getSessionByToken,
  hydrateWorkspaceSnapshot,
  listAuraWhiskies,
  upsertAuraWhiskyUserNotes,
  normalizeUserEmail,
  getTag,
  runWithRequestContext,
  recordContainerImageEvent,
  recordItemImageEvent,
  signInWithEmail,
  signInWithGoogleProfile,
  signOutSession,
  moveContainer,
  moveItem,
  saveContainerPhoto,
  saveItemPhoto,
  searchRecords,
  searchTethrRecords,
  updateContainer,
  updateItem,
  updateLocation
} from "./db.js";
import { renderApp, renderAuraApp, renderAuraHome, renderPrintLabelPage, renderTethrHome } from "./ui.js";

loadLocalEnvFile();

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const sessionCookieName = "tethr_session";
const googleStateCookieName = "tethr_google_state";
const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REDIRECT_URI
);
const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET || "tethr-images";
const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SECRET_KEY
);
const hostedRuntime = Boolean(process.env.VERCEL && supabaseConfigured);
let supabaseBucketEnsured = false;

export async function handleRequest(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionToken = cookies[sessionCookieName] || "";
  const session = hostedRuntime
    ? getHostedSessionByToken(sessionToken)
    : getSessionByToken(sessionToken);
  const context = session
    ? { userId: session.user.id, workspaceId: session.workspace.id, session }
    : {};

  runWithRequestContext(context, async () => {
    try {
      if (hostedRuntime && session) {
        await hydrateHostedWorkspace(session);
      }
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
        return serveUpload(url.pathname, res);
      }

      if (req.method === "GET" && url.pathname.startsWith("/images/")) {
        return serveHybridImage(url.pathname, session, res);
      }

      if (req.method === "POST" && url.pathname === "/api/auth/sign-in") {
        const signedIn = hostedRuntime
          ? await signInWithEmailHosted(await readJson(req))
          : signInWithEmail(await readJson(req));
        setSessionCookie(res, signedIn.sessionToken);
        return sendJson(res, 200, {
          ok: true,
          user: signedIn.user,
          workspace: signedIn.workspace,
          workspaces: signedIn.workspaces
        });
      }

      if (req.method === "GET" && url.pathname === "/api/auth/google/status") {
        return sendJson(res, 200, {
          configured: googleAuthConfigured
        });
      }

      if (req.method === "GET" && url.pathname === "/api/supabase/status") {
        const status = await getSupabaseStatus();
        return sendJson(res, 200, status);
      }

      if (req.method === "GET" && url.pathname === "/auth/google/start") {
        if (!googleAuthConfigured) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in is not configured yet."));
        }
        const stateToken = crypto.randomBytes(24).toString("hex");
        setCookie(res, googleStateCookieName, stateToken, {
          httpOnly: true,
          maxAge: 60 * 10
        });
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("state", stateToken);
        authUrl.searchParams.set("access_type", "online");
        authUrl.searchParams.set("prompt", "select_account");
        res.writeHead(302, { Location: authUrl.toString() });
        res.end();
        return;
      }

      if (req.method === "GET" && url.pathname === "/auth/google/callback") {
        if (!googleAuthConfigured) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in is not configured yet."));
        }
        const code = url.searchParams.get("code") || "";
        const returnedState = url.searchParams.get("state") || "";
        const expectedState = cookies[googleStateCookieName] || "";
        clearCookie(res, googleStateCookieName);
        if (!code || !returnedState || returnedState !== expectedState) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in could not be verified. Please try again."));
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code"
          })
        });
        if (!tokenResponse.ok) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in failed while exchanging the login code."));
        }

        const tokenBody = await tokenResponse.json();
        const accessToken = String(tokenBody.access_token || "").trim();
        if (!accessToken) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in failed because no access token was returned."));
        }

        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        if (!profileResponse.ok) {
          return sendHtml(res, renderSimpleMessagePage("Google sign-in failed while loading the account profile."));
        }

        const profile = await profileResponse.json();
        const signedIn = hostedRuntime
          ? await signInWithGoogleProfileHosted({
              googleId: profile.id,
              email: profile.email,
              name: profile.name,
              avatar: profile.picture
            })
          : signInWithGoogleProfile({
              googleId: profile.id,
              email: profile.email,
              name: profile.name,
              avatar: profile.picture
            });
        setSessionCookie(res, signedIn.sessionToken);
        res.writeHead(302, { Location: "/" });
        res.end();
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/logout") {
        if (!hostedRuntime && cookies[sessionCookieName]) {
          signOutSession(cookies[sessionCookieName]);
        }
        clearSessionCookie(res);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/print-label") {
        ensureAuthenticated(session);
        const token = url.searchParams.get("token") || "";
        const name = url.searchParams.get("name") || "Label";
        const entityType = url.searchParams.get("entityType") || "item";
        const size = url.searchParams.get("size") || "medium";
        const scanUrl = `http://${req.headers.host}/scan/${encodeURIComponent(token)}`;
        const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + encodeURIComponent(scanUrl);
        return sendHtml(res, renderPrintLabelPage({ name, entityType, qrUrl, size }));
      }

      if (req.method === "GET" && url.pathname === "/aura") {
        return sendHtml(res, renderAuraHome());
      }

      if (req.method === "GET" && (url.pathname === "/aura/whiskies" || url.pathname.startsWith("/aura/whiskies/"))) {
        return sendHtml(res, renderAuraApp(url.pathname));
      }

      if (req.method === "GET" && url.pathname === "/") {
        if (session) {
          return sendHtml(res, renderTethrHome());
        }
        return sendHtml(res, renderApp(null));
      }

      if (req.method === "GET" && (url.pathname === "/arca" || url.pathname === "/simulate-scan" || url.pathname.startsWith("/containers/") || url.pathname.startsWith("/scan/"))) {
        const selectedContainer = session && url.pathname.startsWith("/containers/")
          ? getContainerFromRoute(url.pathname.split("/").pop())
          : null;
        return sendHtml(res, renderApp(selectedContainer?.id || null));
      }

      if (req.method === "GET" && url.pathname === "/api/bootstrap") {
        return sendJson(res, 200, {
          ...getBootstrap(url.searchParams.get("selectedContainerId") || null),
          storage: {
            provider: supabaseConfigured ? "supabase" : "local",
            supabaseUrl: process.env.SUPABASE_URL || "",
            bucket: supabaseStorageBucket
          }
        });
      }

      ensureAuthenticated(session);

      if (req.method === "GET" && url.pathname === "/api/aura/whiskies") {
        return sendJson(res, 200, listAuraWhiskies({
          q: url.searchParams.get("q") || "",
          view: url.searchParams.get("view") || "",
          country: url.searchParams.get("country") || "",
          region: url.searchParams.get("region") || "",
          distillery: url.searchParams.get("distillery") || "",
          whiskyId: url.searchParams.get("whiskyId") || ""
        }));
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/aura/whiskies/") && !url.pathname.endsWith("/my-notes")) {
        const id = url.pathname.split("/")[4];
        const detail = getAuraWhiskyDetail(id);
        return detail ? sendJson(res, 200, detail) : sendJson(res, 404, { error: "Whisky not found" });
      }

      if (req.method === "GET" && url.pathname === "/api/tethr-search") {
        return sendJson(res, 200, searchTethrRecords(url.searchParams.get("q") || ""));
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/aura/whiskies/") && url.pathname.endsWith("/entries")) {
        const id = url.pathname.split("/")[4];
        const entry = createAuraWhiskyEntry(id, await readJson(req));
        const syncStatus = session
          ? await syncAuraWhiskyEntryToSupabase(session, entry)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 201, {
          ...entry,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "PATCH" && url.pathname.startsWith("/api/aura/whiskies/") && url.pathname.includes("/entries/")) {
        const parts = url.pathname.split("/");
        const whiskyId = parts[4];
        const entryId = parts[6];
        const entry = updateAuraWhiskyEntry(whiskyId, entryId, await readJson(req));
        const syncStatus = session
          ? await syncAuraWhiskyEntryToSupabase(session, entry)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 200, {
          ...entry,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "PUT" && url.pathname.startsWith("/api/aura/whiskies/") && url.pathname.endsWith("/my-notes")) {
        const id = url.pathname.split("/")[4];
        const notes = upsertAuraWhiskyUserNotes(id, await readJson(req));
        const syncStatus = session
          ? await syncAuraWhiskyUserNotesToSupabase(session, id)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 200, {
          ...notes,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "POST" && url.pathname === "/api/tags") {
        const tag = createTag(await readJson(req));
        const syncStatus = session
          ? await syncTagToSupabase(session, tag)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 201, {
          ...tag,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/tags/")) {
        const token = decodeURIComponent(url.pathname.split("/")[3] || "");
        const tag = getTag(token);
        return tag ? sendJson(res, 200, tag) : sendJson(res, 404, { error: "Tag not found" });
      }

      if (req.method === "PATCH" && url.pathname.startsWith("/api/tags/")) {
        const token = decodeURIComponent(url.pathname.split("/")[3] || "");
        const tag = assignTag(token, await readJson(req));
        const syncStatus = session
          ? await syncTagToSupabase(session, tag)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 200, {
          ...tag,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "POST" && url.pathname === "/api/locations") {
        const location = createLocation(await readJson(req));
        const syncStatus = session
          ? await syncLocationToSupabase(session, location)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 201, {
          ...location,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "PATCH" && url.pathname.startsWith("/api/locations/")) {
        const id = url.pathname.split("/")[3];
        const location = updateLocation(id, await readJson(req));
        const syncStatus = session
          ? await syncLocationToSupabase(session, location)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 200, {
          ...location,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/locations/")) {
        const id = url.pathname.split("/")[3];
        const deleted = deleteLocation(id);
        const syncStatus = session
          ? await deleteSupabaseRecord("locations", session.workspace.id, id)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 200, {
          ...deleted,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/containers/")) {
        const id = url.pathname.split("/")[3];
        const detail = getContainerDetail(id);
        return detail ? sendJson(res, 200, detail) : sendJson(res, 404, { error: "Container not found" });
      }

      if (req.method === "POST" && url.pathname === "/api/containers") {
        const container = createContainer(await readJson(req));
        const syncStatus = session
          ? await syncContainerToSupabase(session, container)
          : { synced: false, reason: "No signed-in session." };
        return sendJson(res, 201, {
          ...container,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "PATCH" && url.pathname.startsWith("/api/containers/") && !url.pathname.endsWith("/move")) {
        const id = url.pathname.split("/")[3];
        const container = updateContainer(id, await readJson(req));
        const syncStatus = session
          ? await syncContainerToSupabase(session, container)
          : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncContainerHistoryToSupabase(session, container.id);
        }
        return sendJson(res, 200, {
          ...container,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/containers/") && url.pathname.endsWith("/photo")) {
        const id = url.pathname.split("/")[3];
        const upload = await readUploadPayload(req);
        const before = hostedRuntime ? null : getContainerDetail(id);
        const saved = hostedRuntime
          ? await saveHostedContainerPhoto(session, id, upload)
          : saveContainerPhoto(id, upload);
        const storageSync = hostedRuntime
          ? { synced: true }
          : session
            ? await syncContainerPhotoToSupabase(session.workspace.id, upload, saved, before)
            : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncContainerHistoryToSupabase(session, saved.id);
        }
        return sendJson(res, 201, {
          ...saved,
          supabaseSync: storageSync
        });
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/containers/") && url.pathname.endsWith("/move")) {
        const id = url.pathname.split("/")[3];
        const body = await readJson(req);
        const moved = moveContainer(id, body.locationId || null, body.notes || "");
        const syncStatus = session
          ? await syncContainerToSupabase(session, moved)
          : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncContainerHistoryToSupabase(session, moved.id);
        }
        return sendJson(res, 200, {
          ...moved,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/containers/")) {
        const id = url.pathname.split("/")[3];
        const detail = getContainerDetail(id);
        const deleted = deleteContainer(id);
        const syncStatus = session
          ? await deleteSupabaseRecord("containers", session.workspace.id, id)
          : { synced: false, reason: "No signed-in session." };
        if (session && detail) {
          await deleteContainerPhotosFromSupabase(session.workspace.id, detail);
        }
        return sendJson(res, 200, {
          ...deleted,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/photos")) {
        const id = url.pathname.split("/")[3];
        const detail = getItemDetail(id);
        return detail ? sendJson(res, 200, detail) : sendJson(res, 404, { error: "Item not found" });
      }

      if (req.method === "POST" && url.pathname === "/api/items") {
        const item = createItem(await readJson(req));
        const syncStatus = session
          ? await syncItemToSupabase(session, item)
          : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncContainerHistoryToSupabase(session, item.container_id);
        }
        return sendJson(res, 201, {
          ...item,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "PATCH" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/move")) {
        const id = url.pathname.split("/")[3];
        const before = hostedRuntime ? getItemDetail(id) : null;
        const item = updateItem(id, await readJson(req));
        const syncStatus = session
          ? await syncItemToSupabase(session, item)
          : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncItemHistoryToSupabase(session, item.id);
          await syncContainerHistoryToSupabase(session, item.container_id);
          const previousContainerId = before?.item?.container_id || null;
          if (previousContainerId && previousContainerId !== item.container_id) {
            await syncContainerHistoryToSupabase(session, previousContainerId);
          }
        }
        return sendJson(res, 200, {
          ...item,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/items/") && url.pathname.endsWith("/move")) {
        const id = url.pathname.split("/")[3];
        const before = hostedRuntime ? getItemDetail(id) : null;
        const body = await readJson(req);
        const moved = moveItem(id, body.containerId, body.notes || "");
        const syncStatus = session
          ? await syncItemToSupabase(session, moved)
          : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncItemHistoryToSupabase(session, moved.id);
          await syncContainerHistoryToSupabase(session, moved.container_id);
          const previousContainerId = before?.item?.container_id || null;
          if (previousContainerId && previousContainerId !== moved.container_id) {
            await syncContainerHistoryToSupabase(session, previousContainerId);
          }
        }
        return sendJson(res, 200, {
          ...moved,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/photos")) {
        const id = url.pathname.split("/")[3];
        const detail = getItemDetail(id);
        const deleted = deleteItem(id);
        const syncStatus = session
          ? await deleteSupabaseRecord("items", session.workspace.id, id)
          : { synced: false, reason: "No signed-in session." };
        if (session && detail) {
          await deleteItemPhotosFromSupabase(session.workspace.id, detail);
          if (hostedRuntime && detail.item?.container_id) {
            await syncContainerHistoryToSupabase(session, detail.item.container_id);
          }
        }
        return sendJson(res, 200, {
          ...deleted,
          supabaseSync: syncStatus
        });
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/items/") && url.pathname.endsWith("/photos")) {
        const id = url.pathname.split("/")[3];
        const upload = await readUploadPayload(req);
        const before = hostedRuntime ? null : getItemDetail(id);
        const saved = hostedRuntime
          ? await saveHostedItemPhoto(session, id, upload)
          : saveItemPhoto(id, upload);
        const storageSync = hostedRuntime
          ? { synced: true }
          : session
            ? await syncItemPhotoToSupabase(session.workspace.id, id, upload, saved, before)
            : { synced: false, reason: "No signed-in session." };
        if (hostedRuntime && session) {
          await syncItemHistoryToSupabase(session, id);
        }
        return sendJson(res, 201, {
          ...saved,
          supabaseSync: storageSync
        });
      }

      if (req.method === "GET" && url.pathname === "/api/search") {
        return sendJson(res, 200, searchRecords(url.searchParams.get("q") || ""));
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const status = error.message === "Unexpected end of JSON input"
        ? 400
        : error.message === "Please sign in."
          ? 401
          : 500;
      sendJson(res, status, { error: error.message || "Unexpected error" });
    }
  });
}

const runningDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runningDirectly) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });

  server.listen(port, host, () => {
    console.log(`TethrArca running at http://${host}:${port}`);
  });
}

function sendHtml(res, body) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function loadLocalEnvFile() {
  const envFile = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envFile)) {
    return;
  }
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }
    process.env[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function setSessionCookie(res, token) {
  setCookie(res, sessionCookieName, token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30
  });
}

function clearSessionCookie(res) {
  clearCookie(res, sessionCookieName);
}

function setCookie(res, name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];
  if (options.httpOnly) {
    pieces.push("HttpOnly");
  }
  if (options.maxAge !== undefined) {
    pieces.push(`Max-Age=${options.maxAge}`);
  }
  appendSetCookie(res, pieces.join("; "));
}

function clearCookie(res, name) {
  appendSetCookie(res, `${name}=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly`);
}

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }
  const values = Array.isArray(existing) ? existing.concat(cookieValue) : [existing, cookieValue];
  res.setHeader("Set-Cookie", values);
}

function parseCookies(headerValue) {
  return String(headerValue || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }
      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function createHostedSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.SUPABASE_SECRET_KEY)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function getHostedSessionByToken(token) {
  const value = String(token || "").trim();
  if (!value || !value.includes(".")) {
    return null;
  }
  const [body, signature] = value.split(".");
  const expected = crypto
    .createHmac("sha256", process.env.SUPABASE_SECRET_KEY)
    .update(body)
    .digest("base64url");
  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function mapSupabaseUser(row) {
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

function mapSupabaseWorkspace(row, role = "owner") {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role
  };
}

async function supabaseSelect(tableName, query = "") {
  const response = await supabaseRequest(`/rest/v1/${tableName}${query}`, {
    method: "GET",
    headers: {
      Prefer: "return=representation"
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function signInWithEmailHosted(input = {}) {
  const email = normalizeUserEmail(input.email);
  const displayName = String(input.name || "").trim() || email.split("@")[0];
  const timestamp = new Date().toISOString();

  let user = (await supabaseSelect("users", `?email=eq.${encodeURIComponent(email)}&select=*`))[0] || null;
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      google_id: "",
      email,
      name: displayName,
      avatar: "",
      created_at: timestamp,
      updated_at: timestamp
    };
    await upsertSupabaseRow("users", user, "id");
  } else if (displayName && displayName !== user.name) {
    user = { ...user, name: displayName, updated_at: timestamp };
    await upsertSupabaseRow("users", user, "id");
  }

  return createHostedSession(user);
}

async function signInWithGoogleProfileHosted(input = {}) {
  const googleId = String(input.googleId || "").trim();
  if (!googleId) {
    throw new Error("Google account id is required");
  }
  const email = normalizeUserEmail(input.email);
  const displayName = String(input.name || "").trim() || email.split("@")[0];
  const avatar = String(input.avatar || "").trim();
  const timestamp = new Date().toISOString();

  let user = (await supabaseSelect("users", `?google_id=eq.${encodeURIComponent(googleId)}&select=*`))[0] || null;
  if (!user) {
    user = (await supabaseSelect("users", `?email=eq.${encodeURIComponent(email)}&select=*`))[0] || null;
  }

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      google_id: googleId,
      email,
      name: displayName,
      avatar,
      created_at: timestamp,
      updated_at: timestamp
    };
  } else {
    user = {
      ...user,
      google_id: googleId,
      email,
      name: displayName,
      avatar: avatar || user.avatar || "",
      updated_at: timestamp
    };
  }
  await upsertSupabaseRow("users", user, "id");

  return createHostedSession(user);
}

async function createHostedSession(userRow) {
  const timestamp = new Date().toISOString();
  let membership = (await supabaseSelect("workspace_members", `?user_id=eq.${encodeURIComponent(userRow.id)}&select=*`))[0] || null;
  let workspace = null;

  if (!membership) {
    workspace = {
      id: crypto.randomUUID(),
      name: `${String(userRow.name || "My").trim()}'s Tethr`,
      owner_user_id: userRow.id,
      created_at: timestamp,
      updated_at: timestamp
    };
    membership = {
      id: `${workspace.id}:${userRow.id}`,
      workspace_id: workspace.id,
      user_id: userRow.id,
      role: "owner",
      created_at: timestamp
    };
    await upsertSupabaseRow("workspaces", workspace, "id");
    await upsertSupabaseRow("workspace_members", membership, "workspace_id,user_id");
  } else {
    workspace = (await supabaseSelect("workspaces", `?id=eq.${encodeURIComponent(membership.workspace_id)}&select=*`))[0] || null;
  }

  const user = mapSupabaseUser(userRow);
  const mappedWorkspace = mapSupabaseWorkspace(workspace, membership.role || "owner");
  const payload = {
    user,
    workspace: mappedWorkspace,
    workspaces: [mappedWorkspace],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  };
  return {
    sessionToken: createHostedSessionToken(payload),
    user,
    workspace: mappedWorkspace,
    workspaces: [mappedWorkspace]
  };
}

async function hydrateHostedWorkspace(session) {
  const workspaceId = session.workspace.id;
  const [
    auraWhiskies,
    auraWhiskyUserNotes,
    auraWhiskyEntries,
    locations,
    containers,
    items,
    photos,
    tags,
    moveLog,
    itemHistory,
    itemEventLog,
    containerEventLog,
    containerActivityLog
  ] = await Promise.all([
    supabaseSelect("aura_whiskies", "?select=*"),
    supabaseSelect(
      "aura_whisky_user_notes",
      `?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(session.user.id)}&select=*`
    ),
    supabaseSelect(
      "aura_whisky_entries",
      `?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(session.user.id)}&select=*`
    ),
    supabaseSelect("locations", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("containers", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("items", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("photos", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("tags", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("move_log", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("item_history", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("item_event_log", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("container_event_log", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`),
    supabaseSelect("container_activity_log", `?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`)
  ]);

  hydrateWorkspaceSnapshot({
    session,
    auraWhiskies,
    auraWhiskyUserNotes,
    auraWhiskyEntries,
    locations,
    containers,
    items,
    photos,
    tags,
    moveLog,
    itemHistory,
    itemEventLog,
    containerEventLog,
    containerActivityLog
  });
}

function ensureAuthenticated(session) {
  if (!session) {
    throw new Error("Please sign in.");
  }
}

async function getSupabaseStatus() {
  if (!supabaseConfigured) {
    return {
      configured: false,
      connected: false,
      error: "Supabase is not configured yet."
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/workspaces?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        configured: true,
        connected: false,
        error: `Supabase returned ${response.status}: ${body.slice(0, 200)}`
      };
    }

    const rows = await response.json();
    return {
      configured: true,
      connected: true,
      workspaceCountSample: Array.isArray(rows) ? rows.length : 0
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error.name === "AbortError"
        ? "Supabase connection timed out."
        : String(error.message || error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function supabaseRequest(pathname, options = {}) {
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    "content-type": "application/json",
    ...(options.headers || {})
  };
  return fetch(`${process.env.SUPABASE_URL}${pathname}`, {
    ...options,
    headers
  });
}

async function upsertSupabaseRow(tableName, row, conflictTarget) {
  const query = conflictTarget ? `?on_conflict=${encodeURIComponent(conflictTarget)}` : "";
  const response = await supabaseRequest(`/rest/v1/${tableName}${query}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function upsertSupabaseRows(tableName, rows, conflictTarget = "id") {
  for (const row of rows || []) {
    await upsertSupabaseRow(tableName, row, conflictTarget);
  }
}

async function deleteSupabaseRecord(tableName, workspaceId, id) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const response = await supabaseRequest(
      `/rest/v1/${tableName}?workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal"
        }
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return { synced: true };
  } catch (error) {
    console.error(`Supabase ${tableName} delete sync failed:`, error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function deleteSupabaseRecordsByField(tableName, fieldName, fieldValue, workspaceId) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const response = await supabaseRequest(
      `/rest/v1/${tableName}?workspace_id=eq.${encodeURIComponent(workspaceId)}&${encodeURIComponent(fieldName)}=eq.${encodeURIComponent(fieldValue)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal"
        }
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return { synced: true };
  } catch (error) {
    console.error(`Supabase ${tableName} delete-by-field sync failed:`, error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

function buildSupabaseObjectPath(workspaceId, category, storedName) {
  return `${workspaceId}/${category}/${storedName}`;
}

async function ensureSupabaseStorageBucket() {
  if (!supabaseConfigured || supabaseBucketEnsured) {
    return;
  }

  const listResponse = await supabaseRequest("/storage/v1/bucket");
  if (!listResponse.ok) {
    throw new Error(await listResponse.text());
  }
  const buckets = await listResponse.json();
  if (Array.isArray(buckets) && buckets.some((bucket) => bucket.id === supabaseStorageBucket)) {
    supabaseBucketEnsured = true;
    return;
  }

  const createResponse = await supabaseRequest("/storage/v1/bucket", {
    method: "POST",
    body: JSON.stringify({
      id: supabaseStorageBucket,
      name: supabaseStorageBucket,
      public: false
    })
  });
  if (!createResponse.ok) {
    throw new Error(await createResponse.text());
  }
  supabaseBucketEnsured = true;
}

async function uploadSupabaseObject(workspaceId, category, storedName, file) {
  await ensureSupabaseStorageBucket();
  const objectPath = buildSupabaseObjectPath(workspaceId, category, storedName);
  const response = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${supabaseStorageBucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        "content-type": file.mimeType || "application/octet-stream",
        "x-upsert": "true"
      },
      body: file.buffer
    }
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return {
    bucket: supabaseStorageBucket,
    objectPath
  };
}

async function deleteSupabaseObject(workspaceId, category, storedName) {
  if (!supabaseConfigured || !storedName) {
    return { synced: false, reason: "Missing storage config or object name." };
  }

  try {
    await ensureSupabaseStorageBucket();
    const response = await supabaseRequest("/storage/v1/object/" + encodeURIComponent(supabaseStorageBucket), {
      method: "DELETE",
      body: JSON.stringify({
        prefixes: [buildSupabaseObjectPath(workspaceId, category, storedName)]
      })
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return { synced: true };
  } catch (error) {
    console.error("Supabase storage delete failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncLocationToSupabase(session, location) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  const timestamp = new Date().toISOString();
  const locationRow = {
    id: location.id,
    workspace_id: location.workspaceId || location.workspace_id || session.workspace.id,
    name: location.name,
    description: location.description || "",
    notes: location.notes || "",
    created_at: location.createdAt || location.created_at || timestamp,
    updated_at: location.updatedAt || location.updated_at || timestamp
  };

  try {
    await upsertSupabaseRow("users", {
      id: session.user.id,
      google_id: session.user.googleId || "",
      email: session.user.email,
      name: session.user.name,
      avatar: session.user.avatar || "",
      created_at: session.user.createdAt || timestamp,
      updated_at: session.user.updatedAt || timestamp
    }, "id");

    await upsertSupabaseRow("workspaces", {
      id: session.workspace.id,
      name: session.workspace.name,
      owner_user_id: session.workspace.ownerUserId || session.user.id,
      created_at: session.workspace.createdAt || timestamp,
      updated_at: session.workspace.updatedAt || timestamp
    }, "id");

    await upsertSupabaseRow("workspace_members", {
      id: `${session.workspace.id}:${session.user.id}`,
      workspace_id: session.workspace.id,
      user_id: session.user.id,
      role: session.workspace.role || "owner",
      created_at: timestamp
    }, "workspace_id,user_id");

    await upsertSupabaseRow("locations", {
      ...locationRow
    }, "id");

    return { synced: true };
  } catch (error) {
    console.error("Supabase location sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncSessionCoreToSupabase(session) {
  const timestamp = new Date().toISOString();

  await upsertSupabaseRow("users", {
    id: session.user.id,
    google_id: session.user.googleId || "",
    email: session.user.email,
    name: session.user.name,
    avatar: session.user.avatar || "",
    created_at: session.user.createdAt || timestamp,
    updated_at: session.user.updatedAt || timestamp
  }, "id");

  await upsertSupabaseRow("workspaces", {
    id: session.workspace.id,
    name: session.workspace.name,
    owner_user_id: session.workspace.ownerUserId || session.user.id,
    created_at: session.workspace.createdAt || timestamp,
    updated_at: session.workspace.updatedAt || timestamp
  }, "id");

  await upsertSupabaseRow("workspace_members", {
    id: `${session.workspace.id}:${session.user.id}`,
    workspace_id: session.workspace.id,
    user_id: session.user.id,
    role: session.workspace.role || "owner",
    created_at: timestamp
  }, "workspace_id,user_id");
}

async function syncLocationRowToSupabase(session, location) {
  const timestamp = new Date().toISOString();
  await upsertSupabaseRow("locations", {
    id: location.id,
    workspace_id: location.workspaceId || location.workspace_id || session.workspace.id,
    name: location.name,
    description: location.description || "",
    notes: location.notes || "",
    created_at: location.createdAt || location.created_at || timestamp,
    updated_at: location.updatedAt || location.updated_at || timestamp
  }, "id");
}

async function syncContainerRowToSupabase(session, container) {
  const timestamp = new Date().toISOString();
  const containerRow = {
    id: container.id,
    workspace_id: container.workspaceId || container.workspace_id || session.workspace.id,
    parent_container_id: container.parentContainerId || container.parent_container_id || null,
    location_id: container.locationId || container.location_id || null,
    name: container.name,
    slug: container.slug || "",
    type: container.type || "",
    description: container.description || "",
    notes: container.notes || "",
    rfid_tag_id: container.rfidTagId || container.rfid_tag_id || "",
    image_file_name: container.imageFileName || container.image_file_name || "",
    image_stored_name: container.imageStoredName || container.image_stored_name || "",
    image_mime_type: container.imageMimeType || container.image_mime_type || "",
    image_size_bytes: container.imageSizeBytes || container.image_size_bytes || 0,
    created_at: container.createdAt || container.created_at || timestamp,
    updated_at: container.updatedAt || container.updated_at || timestamp
  };

  if (containerRow.location_id) {
    const linkedLocation = getLocationForSync(containerRow.location_id);
    if (linkedLocation) {
      await syncLocationRowToSupabase(session, linkedLocation);
    }
  }

  await upsertSupabaseRow("containers", containerRow, "id");
}

async function syncContainerToSupabase(session, container) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    await syncSessionCoreToSupabase(session);
    await syncContainerRowToSupabase(session, container);
    return { synced: true };
  } catch (error) {
    console.error("Supabase container sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncTagToSupabase(session, tag) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  if (!tag?.id || !tag?.token) {
    return { synced: false, reason: "Tag is missing required fields." };
  }

  try {
    await syncSessionCoreToSupabase(session);
    await upsertSupabaseRow("tags", {
      id: tag.id,
      workspace_id: session.workspace.id,
      token: tag.token,
      status: tag.status || "unassigned",
      source: tag.source || "generated",
      entity_type: tag.entityType || null,
      entity_id: tag.entityId || null,
      created_at: tag.createdAt || new Date().toISOString(),
      updated_at: tag.updatedAt || new Date().toISOString()
    }, "id");
    return { synced: true };
  } catch (error) {
    console.error("Supabase tag sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncItemHistoryToSupabase(session, itemId) {
  if (!supabaseConfigured || !itemId) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const detail = getItemDetail(itemId);
    if (!detail) {
      return { synced: false, reason: "Item not found." };
    }
    await upsertSupabaseRows(
      "move_log",
      (detail.moveLog || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        from_container_id: entry.from_container_id || null,
        to_container_id: entry.to_container_id || null,
        from_location_id: entry.from_location_id || null,
        to_location_id: entry.to_location_id || null,
        notes: entry.notes || "",
        moved_at: entry.moved_at
      })),
      "id"
    );
    await upsertSupabaseRows(
      "item_history",
      (detail.quantityLog || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        item_id: itemId,
        event_type: entry.event_type,
        from_quantity: entry.from_quantity ?? null,
        to_quantity: entry.to_quantity ?? null,
        notes: entry.notes || "",
        created_at: entry.created_at
      })),
      "id"
    );
    await upsertSupabaseRows(
      "item_event_log",
      (detail.eventLog || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        item_id: itemId,
        event_type: entry.event_type,
        from_text: entry.from_text || "",
        to_text: entry.to_text || "",
        notes: entry.notes || "",
        created_at: entry.created_at
      })),
      "id"
    );
    return { synced: true };
  } catch (error) {
    console.error("Supabase item history sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncContainerHistoryToSupabase(session, containerId) {
  if (!supabaseConfigured || !containerId) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const detail = getContainerDetail(containerId);
    if (!detail) {
      return { synced: false, reason: "Container not found." };
    }
    await upsertSupabaseRows(
      "move_log",
      (detail.moveLog || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        from_container_id: entry.from_container_id || null,
        to_container_id: entry.to_container_id || null,
        from_location_id: entry.from_location_id || null,
        to_location_id: entry.to_location_id || null,
        notes: entry.notes || "",
        moved_at: entry.moved_at
      })),
      "id"
    );
    await upsertSupabaseRows(
      "container_event_log",
      (detail.eventLog || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        container_id: containerId,
        event_type: entry.event_type,
        from_text: entry.from_text || "",
        to_text: entry.to_text || "",
        notes: entry.notes || "",
        created_at: entry.created_at
      })),
      "id"
    );
    await upsertSupabaseRows(
      "container_activity_log",
      (detail.itemActivity || []).map((entry) => ({
        id: entry.id,
        workspace_id: session.workspace.id,
        container_id: containerId,
        item_id: entry.item_id || null,
        item_name: entry.item_name || "",
        action_type: entry.action_type,
        from_quantity: entry.from_quantity ?? null,
        to_quantity: entry.to_quantity ?? null,
        notes: entry.notes || "",
        created_at: entry.created_at
      })),
      "id"
    );
    return { synced: true };
  } catch (error) {
    console.error("Supabase container history sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncItemToSupabase(session, item) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  const timestamp = new Date().toISOString();
  const itemRow = {
    id: item.id,
    workspace_id: item.workspaceId || item.workspace_id || session.workspace.id,
    container_id: item.containerId || item.container_id,
    name: item.name,
    description: item.description || "",
    notes: item.notes || "",
    quantity: item.quantity || 0,
    created_at: item.createdAt || item.created_at || timestamp,
    updated_at: item.updatedAt || item.updated_at || timestamp
  };

  try {
    await syncSessionCoreToSupabase(session);

    if (itemRow.container_id) {
      const detail = getContainerDetail(itemRow.container_id);
      if (detail?.container) {
        await syncContainerRowToSupabase(session, detail.container);
      }
    }

    await upsertSupabaseRow("items", itemRow, "id");
    return { synced: true };
  } catch (error) {
    console.error("Supabase item sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncAuraWhiskyUserNotesToSupabase(session, whiskyId) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const detail = getAuraWhiskyDetail(whiskyId);
    if (!detail) {
      return { synced: false, reason: "Whisky not found." };
    }

    await upsertSupabaseRow("aura_whisky_user_notes", {
      id: detail.myNotes.id,
      whisky_id: whiskyId,
      workspace_id: session.workspace.id,
      user_id: session.user.id,
      tasting_notes: detail.myNotes.tastingNotes || "",
      personal_notes: detail.myNotes.personalNotes || "",
      created_at: detail.myNotes.createdAt || new Date().toISOString(),
      updated_at: detail.myNotes.updatedAt || new Date().toISOString()
    }, "whisky_id,workspace_id,user_id");

    return { synced: true };
  } catch (error) {
    console.error("Supabase Aura notes sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncAuraWhiskyEntryToSupabase(session, entry) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    await upsertSupabaseRow("aura_whisky_entries", {
      id: entry.id,
      whisky_id: entry.whiskyId,
      workspace_id: session.workspace.id,
      user_id: session.user.id,
      entry_text: entry.entryText || "",
      archived_at: entry.archivedAt || null,
      created_at: entry.createdAt || new Date().toISOString(),
      updated_at: entry.updatedAt || new Date().toISOString()
    }, "id");

    return { synced: true };
  } catch (error) {
    console.error("Supabase Aura entry sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function syncItemPhotoToSupabase(workspaceId, itemId, upload, savedPhoto, beforeDetail) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const previousPhoto = beforeDetail?.photos?.[0] || null;
    await uploadSupabaseObject(workspaceId, "items", savedPhoto.stored_name, upload);
    await deleteSupabaseRecordsByField("photos", "item_id", itemId, workspaceId);
    await upsertSupabaseRow("photos", {
      id: savedPhoto.id,
      workspace_id: workspaceId,
      item_id: itemId,
      file_name: savedPhoto.file_name,
      stored_name: savedPhoto.stored_name,
      mime_type: savedPhoto.mime_type,
      size_bytes: savedPhoto.size_bytes || 0,
      caption: savedPhoto.caption || "",
      created_at: savedPhoto.created_at || new Date().toISOString()
    }, "id");
    if (previousPhoto?.stored_name && previousPhoto.stored_name !== savedPhoto.stored_name) {
      await deleteSupabaseObject(workspaceId, "items", previousPhoto.stored_name);
    }
    return { synced: true };
  } catch (error) {
    console.error("Supabase item photo sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

function buildStoredUploadName(fileName = "") {
  const extension = path.extname(String(fileName || "").trim()).toLowerCase() || ".bin";
  return `${crypto.randomUUID()}${extension}`;
}

async function saveHostedItemPhoto(session, itemId, upload) {
  if (!session?.workspace?.id) {
    throw new Error("Please sign in.");
  }
  const workspaceId = session.workspace.id;
  const existingItem = (await supabaseSelect(
    "items",
    `?workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(itemId)}&select=*`
  ))[0];
  if (!existingItem) {
    throw new Error("Item not found");
  }

  const previousPhotos = await supabaseSelect(
    "photos",
    `?workspace_id=eq.${encodeURIComponent(workspaceId)}&item_id=eq.${encodeURIComponent(itemId)}&select=*&order=created_at.desc`
  );
  const previousFileName = String(previousPhotos[0]?.file_name || "").trim();
  const storedName = buildStoredUploadName(upload.fileName);
  const photoId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await uploadSupabaseObject(workspaceId, "items", storedName, upload);
  for (const photo of previousPhotos) {
    if (photo?.stored_name && photo.stored_name !== storedName) {
      await deleteSupabaseObject(workspaceId, "items", photo.stored_name);
    }
  }
  await deleteSupabaseRecordsByField("photos", "item_id", itemId, workspaceId);
  await upsertSupabaseRow("photos", {
    id: photoId,
    workspace_id: workspaceId,
    item_id: itemId,
    file_name: upload.fileName,
    stored_name: storedName,
    mime_type: upload.mimeType,
    size_bytes: upload.buffer.byteLength,
    caption: "",
    created_at: createdAt
  }, "id");

  recordItemImageEvent(
    itemId,
    previousFileName,
    String(upload.fileName || "").trim()
  );

  return {
    id: photoId,
    item_id: itemId,
    file_name: upload.fileName,
    stored_name: storedName,
    mime_type: upload.mimeType,
    size_bytes: upload.buffer.byteLength,
    caption: "",
    created_at: createdAt
  };
}

async function saveHostedContainerPhoto(session, containerId, upload) {
  if (!session?.workspace?.id) {
    throw new Error("Please sign in.");
  }
  const workspaceId = session.workspace.id;
  const container = (await supabaseSelect(
    "containers",
    `?workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(containerId)}&select=*`
  ))[0];
  if (!container) {
    throw new Error("Container not found");
  }

  const previousFileName = String(container.image_file_name || "").trim();
  const storedName = buildStoredUploadName(upload.fileName);
  await uploadSupabaseObject(workspaceId, "containers", storedName, upload);
  if (container.image_stored_name && container.image_stored_name !== storedName) {
    await deleteSupabaseObject(workspaceId, "containers", container.image_stored_name);
  }

  const updated = {
    ...container,
    image_file_name: upload.fileName,
    image_stored_name: storedName,
    image_mime_type: upload.mimeType,
    image_size_bytes: upload.buffer.byteLength,
    updated_at: new Date().toISOString()
  };
  await upsertSupabaseRow("containers", updated, "id");

  recordContainerImageEvent(
    containerId,
    previousFileName,
    String(upload.fileName || "").trim()
  );

  return updated;
}

async function syncContainerPhotoToSupabase(workspaceId, upload, savedContainer, beforeDetail) {
  if (!supabaseConfigured) {
    return { synced: false, reason: "Supabase is not configured." };
  }

  try {
    const previousStoredName = beforeDetail?.container?.image_stored_name || "";
    const nextStoredName = savedContainer.image_stored_name || "";
    if (!nextStoredName) {
      return { synced: false, reason: "Container image name was missing." };
    }
    await uploadSupabaseObject(workspaceId, "containers", nextStoredName, upload);
    await upsertSupabaseRow("containers", {
      id: savedContainer.id,
      workspace_id: savedContainer.workspaceId || savedContainer.workspace_id || workspaceId,
      parent_container_id: savedContainer.parentContainerId || savedContainer.parent_container_id || null,
      location_id: savedContainer.locationId || savedContainer.location_id || null,
      name: savedContainer.name,
      slug: savedContainer.slug || "",
      type: savedContainer.type || "",
      description: savedContainer.description || "",
      notes: savedContainer.notes || "",
      rfid_tag_id: savedContainer.rfidTagId || savedContainer.rfid_tag_id || "",
      image_file_name: savedContainer.imageFileName || savedContainer.image_file_name || "",
      image_stored_name: savedContainer.imageStoredName || savedContainer.image_stored_name || "",
      image_mime_type: savedContainer.imageMimeType || savedContainer.image_mime_type || "",
      image_size_bytes: savedContainer.imageSizeBytes || savedContainer.image_size_bytes || 0,
      created_at: savedContainer.createdAt || savedContainer.created_at || new Date().toISOString(),
      updated_at: savedContainer.updatedAt || savedContainer.updated_at || new Date().toISOString()
    }, "id");
    if (previousStoredName && previousStoredName !== nextStoredName) {
      await deleteSupabaseObject(workspaceId, "containers", previousStoredName);
    }
    return { synced: true };
  } catch (error) {
    console.error("Supabase container photo sync failed:", error);
    return {
      synced: false,
      reason: String(error.message || error)
    };
  }
}

async function deleteItemPhotosFromSupabase(workspaceId, itemDetail) {
  const photos = Array.isArray(itemDetail?.photos) ? itemDetail.photos : [];
  for (const photo of photos) {
    if (photo?.stored_name) {
      await deleteSupabaseObject(workspaceId, "items", photo.stored_name);
    }
  }
}

async function deleteContainerPhotosFromSupabase(workspaceId, containerDetail) {
  const containerImage = containerDetail?.container?.image_stored_name || "";
  if (containerImage) {
    await deleteSupabaseObject(workspaceId, "containers", containerImage);
  }

  const items = Array.isArray(containerDetail?.items) ? containerDetail.items : [];
  for (const item of items) {
    if (item?.thumbnail_stored_name) {
      await deleteSupabaseObject(workspaceId, "items", item.thumbnail_stored_name);
    }
  }
}

function renderSimpleMessagePage(message) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TethrArca</title>
    <style>
      body { margin:0; font-family:"Segoe UI",sans-serif; background:#eef4fb; color:#18202b; display:grid; place-items:center; min-height:100vh; padding:24px; }
      .card { max-width:540px; width:100%; background:#fff; border-radius:24px; padding:28px; box-shadow:0 24px 56px rgba(20,38,64,.12); }
      h1 { margin:0 0 10px; font-family:Georgia,serif; font-size:2rem; }
      p { margin:0 0 18px; color:#5f6b7b; line-height:1.5; }
      a { display:inline-block; padding:12px 18px; border-radius:999px; background:#dfeafb; color:#18202b; text-decoration:none; font-weight:700; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>TethrArca</h1>
      <p>${escapeHtmlForPage(message)}</p>
      <a href="/">Back to sign in</a>
    </div>
  </body>
</html>`;
}

function escapeHtmlForPage(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serveUpload(pathname, res) {
  const target = getPhotoFile(pathname.replace("/uploads/", ""));
  if (!target) {
    sendJson(res, 404, { error: "Photo not found" });
    return;
  }

  fs.createReadStream(target).pipe(res);
}

async function serveHybridImage(pathname, session, res) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  const category = parts[1] || "";
  const storedName = decodeURIComponent(parts[2] || "");
  if (!["items", "containers"].includes(category) || !storedName) {
    sendJson(res, 404, { error: "Photo not found" });
    return;
  }

  const localTarget = getPhotoFile(storedName);
  if (localTarget && fs.existsSync(localTarget)) {
    fs.createReadStream(localTarget).pipe(res);
    return;
  }

  if (!supabaseConfigured) {
    sendJson(res, 404, { error: "Photo not found" });
    return;
  }

  try {
    const workspaceId = session?.workspace?.id || "";
    if (!workspaceId) {
      sendJson(res, 404, { error: "Photo not found" });
      return;
    }
    const objectPath = buildSupabaseObjectPath(workspaceId, category, storedName);
    const response = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/${supabaseStorageBucket}/${objectPath}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`
        }
      }
    );

    if (!response.ok || !response.body) {
      sendJson(res, 404, { error: "Photo not found" });
      return;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    sendJson(res, 404, { error: "Photo not found" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readMultipart(req) {
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half"
  });

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    throw new Error("Photo upload requires a file field named photo");
  }

  return {
    fileName: photo.name,
    mimeType: photo.type || "application/octet-stream",
    buffer: Buffer.from(await photo.arrayBuffer()),
    caption: String(form.get("caption") || "")
  };
}

async function readUploadPayload(req) {
  const contentType = String(req.headers["content-type"] || "");

  if (contentType.includes("application/json")) {
    const body = await readJson(req);

    // 🚫 Disable file_path in production (Vercel cannot access local files)
    if (body.file_path) {
      throw new Error("file_path is only supported in local development");
    }

    const base64 = String(body.base64 || "").trim();
    if (!base64) {
      throw new Error("Photo upload requires image data");
    }

    return {
      fileName: String(body.fileName || "upload.jpg"),
      mimeType: String(body.mimeType || "image/jpeg"),
      buffer: Buffer.from(base64, "base64"),
      caption: String(body.caption || "")
    };
  }

  // ✅ This is the correct production path (multipart upload)
  return readMultipart(req);
}
}
