import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const seedUploadsDir = path.join(projectRoot, "seed", "uploads");
const tempDataRoots = [
  path.join(os.tmpdir(), "tethrarca"),
  path.join(os.tmpdir(), "tethrarca-data")
];

delete process.env.SUPABASE_DATABASE_ENABLED;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_STORAGE_BUCKET;
delete process.env.SUPABASE_STORAGE_PREFIX;
delete process.env.SUPABASE_STATE_PATH;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;

const { handleRequest } = await import("../src/server.js");

async function resetLocalSmokeStorage() {
  await Promise.all(tempDataRoots.map(async (root) => {
    try {
      await fs.rm(root, { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") {
        throw error;
      }
    }
  }));
}

async function startServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object" && address.port, "expected test server to expose a port");
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function closeServer(server) {
  server.close();
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await once(server, "close");
}

async function api(baseUrl, pathname, options = {}) {
  const response = await fetch(baseUrl + pathname, {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  assert.ok(response.ok, `${response.status} ${response.statusText}: ${text}`);
  return body;
}

async function signIn(baseUrl) {
  const email = `location-photo-${randomUUID()}@tethr.local`;
  const response = await fetch(baseUrl + "/api/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      name: "Location Photo Test"
    })
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  assert.ok(response.ok, `${response.status} ${response.statusText}: ${text}`);

  const setCookieHeaders = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];
  const setCookie = setCookieHeaders[0] || response.headers.get("set-cookie") || "";
  const cookieMatch = /(?:^|,\s*)tethr_session=([^;]+)/.exec(setCookie);
  assert.ok(cookieMatch, "expected sign-in response to set a tethr_session cookie");

  return {
    body,
    cookieHeader: `tethr_session=${cookieMatch[1]}`
  };
}

async function findFixtureImage() {
  const entries = await fs.readdir(seedUploadsDir);
  const match = entries.find((entry) => /\.(png|jpe?g|webp)$/i.test(entry));
  assert.ok(match, "expected at least one seed image fixture");
  return path.join(seedUploadsDir, match);
}

function mimeTypeForFile(target) {
  const ext = path.extname(target).toLowerCase();
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

test("locations can save a photo and expose it in bootstrap", async (t) => {
  await resetLocalSmokeStorage();
  t.after(async () => {
    await resetLocalSmokeStorage();
  });

  const { server, baseUrl } = await startServer();
  t.after(async () => {
    await closeServer(server);
  });

  const signedIn = await signIn(baseUrl);
  const bootstrapProbe = await api(baseUrl, "/api/bootstrap", {
    headers: {
      cookie: signedIn.cookieHeader
    }
  });
  assert.equal(bootstrapProbe.authenticated, true);

  const runId = randomUUID().slice(0, 8);
  const createdLocation = await api(baseUrl, "/api/locations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Photo Test Place ${runId}`,
      notes: "Location photo test"
    })
  });
  assert.ok(createdLocation?.id, "expected location to be created");

  const fixtureImage = await findFixtureImage();
  const buffer = await fs.readFile(fixtureImage);
  const mimeType = mimeTypeForFile(fixtureImage);
  const savedLocation = await api(baseUrl, `/api/locations/${createdLocation.id}/photo`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      fileName: path.basename(fixtureImage),
      mimeType,
      photoBase64: `data:${mimeType};base64,${buffer.toString("base64")}`
    })
  });

  assert.equal(savedLocation.id, createdLocation.id);
  assert.equal(savedLocation.image_file_name, path.basename(fixtureImage));
  assert.equal(savedLocation.image_mime_type, mimeType);
  assert.ok(savedLocation.image_size_bytes > 0);
  assert.match(String(savedLocation.image_stored_name || ""), /\./, "expected saved location to include an image stored name");

  const bootstrap = await api(baseUrl, "/api/bootstrap", {
    headers: {
      cookie: signedIn.cookieHeader
    }
  });
  const locationFromBootstrap = bootstrap.locations.find((entry) => entry.id === createdLocation.id);
  assert.ok(locationFromBootstrap, "expected location in bootstrap");
  assert.equal(locationFromBootstrap.image_file_name, path.basename(fixtureImage));
  assert.equal(locationFromBootstrap.image_mime_type, mimeType);
  assert.ok(locationFromBootstrap.image_size_bytes > 0);

  const uploadResponse = await fetch(`${baseUrl}/uploads/${locationFromBootstrap.image_stored_name}`, {
    headers: {
      cookie: signedIn.cookieHeader
    }
  });
  assert.equal(uploadResponse.status, 200);
  assert.equal(uploadResponse.headers.get("content-type"), mimeType);
});
