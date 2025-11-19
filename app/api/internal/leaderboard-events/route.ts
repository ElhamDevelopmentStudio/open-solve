import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { broadcastLeaderboardUpdate } from "@/lib/realtime/notifications";
import { LEADERBOARD_WINDOWS, type LeaderboardWindow } from "@/lib/leaderboard/service";

export const runtime = "nodejs";

const isLeaderboardWindow = (value: unknown): value is LeaderboardWindow =>
  typeof value === "string" && (LEADERBOARD_WINDOWS as readonly string[]).includes(value);

export async function POST(request: Request) {
  if (!env.REALTIME_WORKER_TOKEN) {
    return NextResponse.json({ error: "realtime_bridge_disabled" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.REALTIME_WORKER_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let windows: LeaderboardWindow[] = [];
  try {
    const body = (await request.json()) as { windows?: unknown };
    if (Array.isArray(body.windows)) {
      windows = body.windows.filter(isLeaderboardWindow);
    }
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (windows.length === 0) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  broadcastLeaderboardUpdate(windows);
  return NextResponse.json({ ok: true });
}
