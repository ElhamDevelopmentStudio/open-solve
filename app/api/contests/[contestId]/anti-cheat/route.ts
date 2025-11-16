import { ingestContestAntiCheatEvents, resolveContestAntiCheatContext } from "@/lib/contests/anti-cheat/service";
import type { ContestAntiCheatClientEvent } from "@/lib/contests/anti-cheat/types";
import { getSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { hashWithSecret } from "@/lib/security/hash";
import { NextResponse } from "next/server";
import { z } from "zod";

const viewportSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .optional();

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("session_start"),
    sessionId: z.string().min(6),
    deviceType: z.enum(["desktop", "tablet", "mobile"]),
    osFamily: z.string().optional(),
    browserFamily: z.string().optional(),
    connectionType: z.string().optional(),
    occurredAt: z.string().datetime().optional(),
    viewport: viewportSchema,
    problemId: z.string().optional(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("session_end"),
    sessionId: z.string().min(6),
    reason: z.string().optional(),
    occurredAt: z.string().datetime().optional(),
    problemId: z.string().optional(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("focus_metrics"),
    sessionId: z.string().min(6),
    delta: z
      .object({
        tabSwitches: z.number().int().nonnegative().optional(),
        outOfFocusMs: z.number().int().nonnegative().optional(),
        maxConsecutiveOutMs: z.number().int().nonnegative().optional(),
      })
      .optional(),
    problemId: z.string().optional(),
    label: z.string().optional(),
    occurredAt: z.string().datetime().optional(),
  }),
  z.object({
    type: z.literal("paste"),
    sessionId: z.string().min(6),
    pastedLength: z.number().int().positive(),
    problemId: z.string().optional(),
    label: z.string().optional(),
    occurredAt: z.string().datetime().optional(),
  }),
]);

const payloadSchema = z.array(eventSchema).min(1).max(64);

export async function POST(
  request: Request,
  { params }: { params: { contestId: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  let events: ContestAntiCheatClientEvent[];
  try {
    const parsed = payloadSchema.parse(Array.isArray(body) ? body : [body]);
    events = parsed as ContestAntiCheatClientEvent[];
  } catch (error) {
    logger.warn({ err: error }, "anti-cheat payload validation failed");
    return NextResponse.json({ ok: false, error: "invalid_shape" }, { status: 400 });
  }
  const contestContext = await resolveContestAntiCheatContext(params.contestId, session.user.id);
  if (!contestContext) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const geoRegion =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-geo-country") ??
    undefined;
  try {
    const result = await ingestContestAntiCheatEvents({
      context: contestContext,
      events,
      ipHash: ip ? hashWithSecret(ip, params.contestId) : null,
      geoRegion: geoRegion ?? null,
    });
    return NextResponse.json({
      ok: true,
      warnings: result.warnings,
      flagged: result.flagged,
      disqualified: result.disqualified,
      status: result.status,
      ignored: result.ignored,
    });
  } catch (error) {
    logger.error({ err: error }, "anti-cheat ingest failed");
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
