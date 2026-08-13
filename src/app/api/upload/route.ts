import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveImage } from "@/lib/store/image-store";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "No file provided (field: file)" },
      { status: 400 },
    );
  }

  const mimeType = file.type || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = 8 * 1024 * 1024; // 8MB
  if (buffer.length > maxBytes) {
    return NextResponse.json(
      { error: "Image exceeds 8MB limit" },
      { status: 413 },
    );
  }

  try {
    const saved = await saveImage(buffer, mimeType, file.name);
    return NextResponse.json({ url: saved.url, publicId: saved.publicId ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
