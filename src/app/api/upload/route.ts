import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveImage, sniffImageType } from "@/lib/store/image-store";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "noFileProvided" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = 8 * 1024 * 1024; // 8MB
  if (buffer.length > maxBytes) {
    return NextResponse.json(
      { error: "imageTooLarge" },
      { status: 413 },
    );
  }

  // Validate by content, not by the client-declared MIME type. Rejects SVGs
  // and any file whose magic bytes don't match a supported raster format.
  const mimeType = sniffImageType(buffer);
  if (!mimeType) {
    return NextResponse.json({ error: "imagesOnly" }, { status: 400 });
  }

  try {
    const saved = await saveImage(buffer, mimeType, file.name);
    return NextResponse.json({ url: saved.url, publicId: saved.publicId ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "uploadFailed" },
      { status: 500 },
    );
  }
}
