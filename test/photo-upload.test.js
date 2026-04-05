import test from "node:test";
import assert from "node:assert/strict";
import { resolvePhotoUploadPayload } from "../src/photo-upload.js";

test("resolvePhotoUploadPayload downloads the first OpenAI file reference", async () => {
  const payload = {
    caption: "front view",
    openaiFileIdRefs: [
      {
        name: "lamp.png",
        mime_type: "image/png",
        download_link: "https://files.example/lamp.png"
      }
    ]
  };

  const result = await resolvePhotoUploadPayload(payload, {
    fetchImpl: async (url) => {
      assert.equal(url, "https://files.example/lamp.png");
      return new Response(Buffer.from("png-bytes"), {
        status: 200,
        headers: {
          "content-type": "image/png"
        }
      });
    }
  });

  assert.equal(result.fileName, "lamp.png");
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.caption, "front view");
  assert.equal(result.buffer.toString("utf8"), "png-bytes");
});

test("resolvePhotoUploadPayload supports inline base64 data URLs", async () => {
  const result = await resolvePhotoUploadPayload({
    fileName: "box-photo.jpg",
    photoBase64: `data:image/jpeg;base64,${Buffer.from("jpeg-bytes").toString("base64")}`
  });

  assert.equal(result.fileName, "box-photo.jpg");
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.buffer.toString("utf8"), "jpeg-bytes");
});

test("resolvePhotoUploadPayload rejects bodies without a supported photo source", async () => {
  await assert.rejects(
    () => resolvePhotoUploadPayload({ caption: "missing photo" }),
    /openaiFileIdRefs, photoUrl, or photoBase64/
  );
});
