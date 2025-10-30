import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { TELEMETRY_EVENTS } from "@/lib/telemetry/events";

const telemetrySchema = z.object({
  event: z.enum(TELEMETRY_EVENTS),
  payload: z.record(z.any()).default({}),
  path: z.string().optional(),
  timestamp: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = telemetrySchema.parse(body);

    logger.info(
      {
        event: data.event,
        payload: data.payload,
        path: data.path,
        timestamp: data.timestamp ?? Date.now(),
      },
      "telemetry event",
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn({ err: error }, "telemetry event failed");
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
