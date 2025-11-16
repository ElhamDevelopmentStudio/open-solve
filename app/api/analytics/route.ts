import { getSession } from "@/lib/auth/session";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { enforceAnalyticsRetention } from "@/lib/analytics/retention";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

const viewportSchema = z.object({
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
});

const contextSchema = z.object({
  problemId: z.string().min(1).optional(),
  contestId: z.string().min(1).optional(),
  languageCode: z.string().min(1).optional(),
  route: z.string().optional(),
  deviceType: z.enum(["desktop", "tablet", "mobile"]).optional(),
  osFamily: z.string().optional(),
  browserFamily: z.string().optional(),
  viewport: viewportSchema.optional(),
});

const eventSchema = z.object({
  eventName: z.enum(ANALYTICS_EVENTS),
  version: z.number().int().min(1).default(1),
  timestamp: z.string().datetime().optional(),
  sessionId: z.string().optional(),
  context: contextSchema.default({}),
  payload: z.record(z.any()).default({}),
});

const MAX_EVENTS_PER_REQUEST = 32;

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (error) {
    logger.warn({ err: error }, "analytics payload parse failed");
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const bodyArray = Array.isArray(rawBody) ? rawBody : [rawBody];
  if (bodyArray.length === 0 || bodyArray.length > MAX_EVENTS_PER_REQUEST) {
    return NextResponse.json(
      { ok: false, error: "invalid_event_batch" },
      { status: 400 },
    );
  }

  let parsedEvents: z.infer<typeof eventSchema>[];
  try {
    parsedEvents = bodyArray.map((payload) => eventSchema.parse(payload));
  } catch (error) {
    logger.warn({ err: error }, "invalid analytics payload");
    return NextResponse.json({ ok: false, error: "invalid_payload_shape" }, { status: 400 });
  }

  const session = await getSession();
  const userId = session?.user.id ?? null;

  try {
    await prisma.analyticsEvent.createMany({
      data: parsedEvents.map((event) => ({
        eventName: event.eventName,
        version: event.version,
        userId,
        sessionId: event.sessionId ?? null,
        problemId: event.context.problemId ?? null,
        contestId: event.context.contestId ?? null,
        languageCode: event.context.languageCode ?? null,
        deviceType: event.context.deviceType ?? null,
        osFamily: event.context.osFamily ?? null,
        browserFamily: event.context.browserFamily ?? null,
        route: event.context.route ?? request.headers.get("referer") ?? null,
        viewportWidth: event.context.viewport?.width ?? null,
        viewportHeight: event.context.viewport?.height ?? null,
        context: event.context,
        payload: event.payload,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "failed to persist analytics events");
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  void enforceAnalyticsRetention().catch((error) => {
    logger.error({ err: error }, "analytics retention failed");
  });

  return NextResponse.json({ ok: true });
}
