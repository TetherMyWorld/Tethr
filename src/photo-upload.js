const IMAGE_MIME_BY_EXTENSION = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function upstreamError(message) {
  const error = new Error(message);
  error.status = 502;
  return error;
}

function normalizeMimeType(value) {
  return String(value || "").trim().toLowerCase().split(";")[0];
}

function normalizeFileName(value, fallback = "image") {
  const text = String(value || "").trim();
  return text || fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isImageMimeType(value) {
  return normalizeMimeType(value).startsWith("image/");
}

function extensionFromFileName(fileName) {
  const match = /\.[a-z0-9]+$/i.exec(String(fileName || "").trim());
  return match ? match[0].toLowerCase() : "";
}

export function inferMimeTypeFromFileName(fileName) {
  return IMAGE_MIME_BY_EXTENSION.get(extensionFromFileName(fileName)) || "";
}

function inferFileNameFromUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return normalizeFileName(lastSegment, "image");
  } catch {
    return "image";
  }
}

function selectOpenAiFileReference(payload) {
  const refs = Array.isArray(payload?.openaiFileIdRefs) ? payload.openaiFileIdRefs : [];
  if (refs.length === 0) {
    return null;
  }

  return refs.find((entry) => (
    isPlainObject(entry)
    && (
      isImageMimeType(entry.mime_type || entry.mimeType)
      || inferMimeTypeFromFileName(entry.name)
    )
  )) || refs.find((entry) => isPlainObject(entry)) || null;
}

function getNestedPhoto(payload) {
  return isPlainObject(payload?.photo) ? payload.photo : {};
}

function decodeBase64Image(value) {
  const source = String(value || "").trim();
  if (!source) {
    return null;
  }

  const match = /^data:([^;,]+);base64,(.+)$/i.exec(source);
  if (match) {
    return {
      mimeType: normalizeMimeType(match[1]),
      buffer: Buffer.from(match[2], "base64")
    };
  }

  return {
    mimeType: "",
    buffer: Buffer.from(source, "base64")
  };
}

async function downloadFile(url, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw upstreamError(`Could not download the image file: ${error instanceof Error ? error.message : "request failed"}`);
  }

  if (!response.ok) {
    throw upstreamError(`Could not download the image file (status ${response.status})`);
  }

  return {
    mimeType: normalizeMimeType(response.headers.get("content-type")),
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

export function normalizeUploadedPhotoFile({
  buffer,
  fileName,
  mimeType,
  caption
}) {
  const normalizedMimeType = normalizeMimeType(mimeType) || inferMimeTypeFromFileName(fileName) || "application/octet-stream";
  if (!isImageMimeType(normalizedMimeType)) {
    throw badRequest("The uploaded file must be an image.");
  }

  if (!buffer || buffer.byteLength === 0) {
    throw badRequest("The uploaded image was empty.");
  }

  return {
    fileName: normalizeFileName(fileName),
    mimeType: normalizedMimeType,
    buffer,
    caption: String(caption || "").trim()
  };
}

export async function resolvePhotoUploadPayload(payload, options = {}) {
  if (!isPlainObject(payload)) {
    throw badRequest("Photo upload requires a JSON object body.");
  }

  const nestedPhoto = getNestedPhoto(payload);
  const caption = payload.caption || nestedPhoto.caption || "";
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const openAiFile = selectOpenAiFileReference(payload);

  if (openAiFile) {
    if (typeof fetchImpl !== "function") {
      throw upstreamError("Global fetch is not available to download the image file.");
    }

    const downloadLink = String(openAiFile.download_link || openAiFile.downloadLink || "").trim();
    if (!downloadLink) {
      throw badRequest("The uploaded OpenAI file reference did not include a download link.");
    }

    const downloaded = await downloadFile(downloadLink, fetchImpl);
    return normalizeUploadedPhotoFile({
      buffer: downloaded.buffer,
      fileName: openAiFile.name || inferFileNameFromUrl(downloadLink),
      mimeType: openAiFile.mime_type || openAiFile.mimeType || downloaded.mimeType,
      caption
    });
  }

  const photoUrl = String(
    payload.photoUrl
    || payload.imageUrl
    || nestedPhoto.url
    || nestedPhoto.downloadLink
    || ""
  ).trim();

  if (photoUrl) {
    if (typeof fetchImpl !== "function") {
      throw upstreamError("Global fetch is not available to download the image file.");
    }

    const downloaded = await downloadFile(photoUrl, fetchImpl);
    return normalizeUploadedPhotoFile({
      buffer: downloaded.buffer,
      fileName: payload.fileName || payload.name || nestedPhoto.fileName || nestedPhoto.name || inferFileNameFromUrl(photoUrl),
      mimeType: payload.mimeType || payload.mime_type || nestedPhoto.mimeType || nestedPhoto.mime_type || downloaded.mimeType,
      caption
    });
  }

  const inlineBase64 =
    payload.photoBase64
    || payload.imageBase64
    || payload.base64
    || nestedPhoto.base64
    || nestedPhoto.content
    || "";
  if (inlineBase64) {
    const decoded = decodeBase64Image(inlineBase64);
    return normalizeUploadedPhotoFile({
      buffer: decoded.buffer,
      fileName: payload.fileName || payload.name || nestedPhoto.fileName || nestedPhoto.name || "image",
      mimeType: payload.mimeType || payload.mime_type || nestedPhoto.mimeType || nestedPhoto.mime_type || decoded.mimeType,
      caption
    });
  }

  throw badRequest("Photo upload requires multipart form-data with a photo field or JSON with openaiFileIdRefs, photoUrl, or photoBase64.");
}
