import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type SavedImage = { url: string; publicId?: string };

function baseUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export function placeholderUrl(text: string): string {
  return `/api/placeholder?t=${encodeURIComponent(text)}&w=600&h=600`;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type AllowedImageMime = keyof typeof EXT_BY_MIME;

// Sniff the real image type from magic bytes instead of trusting the
// client-supplied MIME header. SVGs are intentionally rejected because they
// can carry active script content (stored-XSS).
export function sniffImageType(buffer: Buffer): AllowedImageMime | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.readUInt32BE(0) === 0x89504e47 &&
    buffer.readUInt32BE(4) === 0x0d0a1a0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 4) === "GIF87" ||
      buffer.toString("ascii", 0, 4) === "GIF89")
  ) {
    return "image/gif";
  }
  return null;
}

export async function saveImage(
  buffer: Buffer,
  _mimeType: string,
  _alt?: string,
): Promise<SavedImage> {
  // Only raster image MIME types we have whitelisted; never store raw uploads
  // under an extension that a browser could interpret as executable content.
  const detected = sniffImageType(buffer);
  if (!detected) {
    throw new Error("imagesOnly");
  }
  const ext = EXT_BY_MIME[detected];
  const store = process.env.UPLOAD_STORE ?? "local";

  if (store === "cloudinary") {
    return saveToCloudinary(buffer, detected);
  }

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  const publicBase = process.env.PUBLIC_UPLOAD_BASE ?? "/uploads";
  return { url: `${publicBase}/${fileName}` };
}

async function saveToCloudinary(
  buffer: Buffer,
  mimeType: string,
): Promise<SavedImage> {
  const config = process.env.CLOUDINARY_URL;
  if (!config) throw new Error("CLOUDINARY_URL is not configured");

  const [part] = config.replace("cloudinary://", "").split("@");
  const [apiKey, apiSecret] = part.split(":");
  const cloudName = config.split("@")[1];

  const data = new FormData();
  data.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }));
  data.append("api_key", apiKey);
  data.append("timestamp", String(Math.floor(Date.now() / 1000)));

  const signature = await signCloudinary(data, apiSecret);
  data.append("signature", signature);
  if (process.env.CLOUDINARY_FOLDER) {
    data.append("folder", process.env.CLOUDINARY_FOLDER);
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: data },
  );
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { url: json.secure_url, publicId: json.public_id };
}

async function signCloudinary(
  formData: FormData,
  apiSecret: string,
): Promise<string> {
  const entries = Array.from(formData.entries()).filter(([k]) => k !== "file");
  const params = entries
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("&");
  const crypto = await import("node:crypto");
  return crypto
    .createHash("sha1")
    .update(`${params}${apiSecret}`)
    .digest("hex");
}

export { baseUrl };
