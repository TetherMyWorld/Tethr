import http from "node:http";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignTag,
  createContainer,
  createItem,
  createLocation,
  createTag,
  deleteContainer,
  deleteItem,
  deleteLocation,
  getBootstrap,
  getContainerDetail,
  getContainerFromRoute,
  getItemDetail,
  getPhotoAsset,
  getTag,
  moveContainer,
  moveItem,
  saveContainerPhoto,
  saveItemPhoto,
  searchRecords,
  updateContainer,
  updateItem,
  updateLocation
} from "./db.js";
import { renderApp } from "./ui.js";

const host = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

export default async function handleRequest(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
      return serveUpload(url.pathname, res);
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/simulate-scan" || url.pathname.startsWith("/containers/") || url.pathname.startsWith("/scan/"))) {
      const selectedContainer = url.pathname.startsWith("/containers/")
        ? await getContainerFromRoute(url.pathname.split("/").pop())
        : null;
      return sendHtml(res, renderApp(selectedContainer?.id || null));
    }

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      return sendJson(res, 200, await getBootstrap(url.searchParams.get("selectedContainerId") || null));
    }

    if (req.method === "POST" && url.pathname === "/api/tags") {
      return sendJson(res, 201, await createTag(await readJson(req)));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/tags/")) {
      const token = decodeURIComponent(url.pathname.split("/")[3] || "");
      const tag = await getTag(token);
      return tag ? sendJson(res, 200, tag) : sendJson(res, 404, { error: "Tag not found" });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/tags/")) {
      const token = decodeURIComponent(url.pathname.split("/")[3] || "");
      return sendJson(res, 200, await assignTag(token, await readJson(req)));
    }

    if (req.method === "POST" && url.pathname === "/api/locations") {
      return sendJson(res, 201, await createLocation(await readJson(req)));
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/locations/")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await updateLocation(id, await readJson(req)));
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/locations/")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await deleteLocation(id));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/containers/")) {
      const id = url.pathname.split("/")[3];
      const detail = await getContainerDetail(id);
      return detail ? sendJson(res, 200, detail) : sendJson(res, 404, { error: "Container not found" });
    }

    if (req.method === "POST" && url.pathname === "/api/containers") {
      return sendJson(res, 201, await createContainer(await readJson(req)));
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/containers/") && !url.pathname.endsWith("/move")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await updateContainer(id, await readJson(req)));
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/containers/") && url.pathname.endsWith("/photo")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 201, await saveContainerPhoto(id, await readMultipart(req)));
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/containers/") && url.pathname.endsWith("/move")) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return sendJson(res, 200, await moveContainer(id, body.locationId || null, body.notes || ""));
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/containers/")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await deleteContainer(id));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/photos")) {
      const id = url.pathname.split("/")[3];
      const detail = await getItemDetail(id);
      return detail ? sendJson(res, 200, detail) : sendJson(res, 404, { error: "Item not found" });
    }

    if (req.method === "POST" && url.pathname === "/api/items") {
      return sendJson(res, 201, await createItem(await readJson(req)));
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/move")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await updateItem(id, await readJson(req)));
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/items/") && url.pathname.endsWith("/move")) {
      const id = url.pathname.split("/")[3];
      const body = await readJson(req);
      return sendJson(res, 200, await moveItem(id, body.containerId, body.notes || ""));
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/items/") && !url.pathname.endsWith("/photos")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 200, await deleteItem(id));
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/items/") && url.pathname.endsWith("/photos")) {
      const id = url.pathname.split("/")[3];
      return sendJson(res, 201, await saveItemPhoto(id, await readMultipart(req)));
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      return sendJson(res, 200, await searchRecords(url.searchParams.get("q") || ""));
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unexpected end of JSON input" ? 400 : 500;
    return sendJson(res, status, { error: message });
  }
}

function sendHtml(res, body) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function serveUpload(pathname, res) {
  const asset = await getPhotoAsset(pathname.replace("/uploads/", ""));
  if (!asset) {
    sendJson(res, 404, { error: "Photo not found" });
    return;
  }

  res.writeHead(200, {
    "content-type": asset.contentType || "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable"
  });

  if (asset.isWebStream) {
    Readable.fromWeb(asset.body).pipe(res);
    return;
  }

  res.end(asset.body);
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

function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  const server = http.createServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`TethrArca running at http://127.0.0.1:${port}`);
  });
}
