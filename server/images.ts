import fs from "fs";
import path from "path";
import { put, del } from "@vercel/blob";
import { generateSecureId } from "./security.js";

// Image storage: Vercel Blob when a token is configured (persistent,
// CDN-served, survives redeploys), the local uploads directory otherwise
// (development, tests, self-hosted). Callers store whatever URL is returned
// — relative for local files, absolute for Blob — and <img src> handles both.

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

function uploadDir(): string {
  return (
    process.env.UPLOAD_DIR ||
    (process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads"))
  );
}

export function blobConfigured(): boolean {
  return process.env.NODE_ENV !== "test" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveImage(buffer: Buffer, ext: string): Promise<string> {
  const fileName = `${Date.now()}_${generateSecureId()}.${ext}`;

  if (blobConfigured()) {
    const blob = await put(`uploads/${fileName}`, buffer, {
      access: "public",
      contentType: CONTENT_TYPES[ext] || "application/octet-stream",
      addRandomSuffix: false, // the name is already server-generated and random
    });
    return blob.url;
  }

  const dir = uploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return `/uploads/${fileName}`;
}

// Best-effort removal of a stored image. Only URLs this module could have
// produced are touched; anything else (external stock photos, seed assets)
// is ignored. Failures are logged, never thrown — image cleanup must not
// block account or content deletion.
// True only for URLs this app itself issued. Anything else — another site's
// image, or a Blob path we did not create — must never be accepted into a
// profile nor passed to the delete API.
export function isAppIssuedImage(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/uploads\/[\w.-]+$/.test(url);
}

export async function deleteImage(url: string | undefined): Promise<void> {
  if (!url) return;

  // Deleting is destructive and irreversible: refuse anything we did not
  // issue, so a crafted URL can never remove another member's photo.
  if (!isAppIssuedImage(url)) return;

  try {
    if (url.startsWith("/uploads/")) {
      const filePath = path.join(uploadDir(), path.basename(url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    if (blobConfigured() && url.includes(".blob.vercel-storage.com/")) {
      await del(url);
    }
  } catch (error) {
    console.error("Could not delete stored image:", error);
  }
}
