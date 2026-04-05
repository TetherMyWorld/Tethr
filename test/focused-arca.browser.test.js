import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
  const email = `focused-smoke-${randomUUID()}@tethr.local`;
  const response = await fetch(baseUrl + "/api/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      name: "Focused Smoke"
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
    cookieHeader: `tethr_session=${cookieMatch[1]}`,
    cookieValue: cookieMatch[1]
  };
}

async function findFixtureImage() {
  const entries = await fs.readdir(seedUploadsDir);
  const match = entries.find((entry) => /\.(png|jpe?g|webp)$/i.test(entry));
  assert.ok(match, "expected at least one seed image fixture");
  return path.join(seedUploadsDir, match);
}

async function launchSmokeBrowser() {
  const attempts = process.platform === "win32"
    ? [
        { channel: "msedge", headless: true },
        { channel: "chrome", headless: true },
        { headless: true }
      ]
    : [{ headless: true }];
  let lastError = null;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createAuthenticatedContext(browser, baseUrl, signedIn) {
  const context = await browser.newContext();
  await context.setExtraHTTPHeaders({
    Cookie: signedIn.cookieHeader
  });
  await context.addCookies([
    {
      name: "tethr_session",
      value: signedIn.cookieValue,
      url: baseUrl
    }
  ]);
  return context;
}

async function uploadPhotoThroughItemModal(page, fixtureImage) {
  await page.locator("#edit-item-button").waitFor();
  await page.locator("#edit-item-button").click();
  await page.locator(".modal-shell").waitFor();
  await page.locator("#item-photo-input").setInputFiles(fixtureImage);
  await page.locator('button.save-icon[type="submit"]').click();
  await page.waitForFunction(() => {
    const modalRoot = document.getElementById("modal-root");
    return Boolean(modalRoot && modalRoot.hidden);
  });
}

test("home search route opens an item detail and uploads an image", { timeout: 120_000 }, async (t) => {
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
  const smokeLocation = await api(baseUrl, "/api/locations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Smoke Test Place ${runId}`,
      notes: "Browser smoke location"
    })
  });
  const targetContainer = await api(baseUrl, "/api/containers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Smoke Test Container ${runId}`,
      locationId: smokeLocation.id,
      notes: "Browser smoke container"
    })
  });

  const createdItem = await api(baseUrl, "/api/items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Focused Browser Smoke Item ${runId}`,
      containerId: targetContainer.id,
      quantity: 1,
      notes: ""
    })
  });
  assert.ok(createdItem?.id, "expected the smoke item to be created");

  const browser = await launchSmokeBrowser();
  t.after(async () => {
    await browser.close();
  });

  const context = await createAuthenticatedContext(browser, baseUrl, signedIn);
  t.after(async () => {
    await context.close();
  });
  const page = await context.newPage();
  const fixtureImage = await findFixtureImage();

  await page.goto(`${baseUrl}/arca`, { waitUntil: "domcontentloaded" });
  await page.locator(".home-shell-title").waitFor();
  await page.locator("#home-search-input").fill(createdItem.name);
  await page.locator("#home-search-form").press("Enter");
  await page.waitForURL((url) => url.pathname === "/search");
  await page.locator(`.search-result-card[data-search-id="${createdItem.id}"]`).waitFor();
  await page.locator(`.search-result-card[data-search-id="${createdItem.id}"]`).click();
  await page.locator("#edit-item-button").waitFor();

  await uploadPhotoThroughItemModal(page, fixtureImage);

  const detail = await api(baseUrl, `/api/items/${createdItem.id}`, {
    headers: {
      cookie: signedIn.cookieHeader
    }
  });
  assert.equal(detail.item.id, createdItem.id);
  assert.equal(detail.photos.length, 1);
  assert.match(String(detail.photos[0].file_name || ""), /\.(jpe?g|png|webp)$/i);
});

test("container route opens an item detail and uploads an image", { timeout: 120_000 }, async (t) => {
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
  const smokeLocation = await api(baseUrl, "/api/locations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Regular Smoke Place ${runId}`,
      notes: "Browser smoke location"
    })
  });
  const targetContainer = await api(baseUrl, "/api/containers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Regular Smoke Container ${runId}`,
      locationId: smokeLocation.id,
      notes: "Browser smoke container"
    })
  });

  const createdItem = await api(baseUrl, "/api/items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: signedIn.cookieHeader
    },
    body: JSON.stringify({
      name: `Regular Modal Smoke Item ${runId}`,
      containerId: targetContainer.id,
      quantity: 1,
      notes: ""
    })
  });
  assert.ok(createdItem?.id, "expected the regular modal smoke item to be created");

  const browser = await launchSmokeBrowser();
  t.after(async () => {
    await browser.close();
  });

  const context = await createAuthenticatedContext(browser, baseUrl, signedIn);
  t.after(async () => {
    await context.close();
  });
  const page = await context.newPage();
  const fixtureImage = await findFixtureImage();

  await page.goto(`${baseUrl}/containers/${targetContainer.id}`, { waitUntil: "domcontentloaded" });
  await page.locator(`[data-open-item="${createdItem.id}"]`).click();
  await uploadPhotoThroughItemModal(page, fixtureImage);

  const detail = await api(baseUrl, `/api/items/${createdItem.id}`, {
    headers: {
      cookie: signedIn.cookieHeader
    }
  });
  assert.equal(detail.item.id, createdItem.id);
  assert.equal(detail.photos.length, 1);
  assert.match(String(detail.photos[0].file_name || ""), /\.(jpe?g|png|webp)$/i);
});
