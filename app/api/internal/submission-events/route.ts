import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { broadcastSubmissionUpdate } from "@/lib/realtime/notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.REALTIME_WORKER_TOKEN) {
    return NextResponse.json({ error: "realtime_bridge_disabled" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.REALTIME_WORKER_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let submissionId: string | null = null;
  try {
    const body = (await request.json()) as { submissionId?: string };
    submissionId = typeof body.submissionId === "string" ? body.submissionId : null;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!submissionId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  await broadcastSubmissionUpdate(submissionId);
  return NextResponse.json({ ok: true });
}
