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
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function saveImage(
  buffer: Buffer,
  mimeType: string,
  alt?: string,
): Promise<SavedImage> {
  const ext = EXT_BY_MIME[mimeType] ?? "bin";
  const store = process.env.UPLOAD_STORE ?? "local";

  if (store === "cloudinary") {
    return saveToCloudinary(buffer, mimeType);
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
