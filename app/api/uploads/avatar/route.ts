import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadAvatarToMinio } from "@/lib/storage/minio";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const key = await uploadAvatarToMinio({
      userId: session.user.id,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    });
    return NextResponse.json({ url: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

