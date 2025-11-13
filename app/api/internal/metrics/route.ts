import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { metricsRegistry, refreshOperationalMetrics } from "@/lib/observability/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (env.METRICS_ACCESS_TOKEN) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (authHeader !== `Bearer ${env.METRICS_ACCESS_TOKEN}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  await refreshOperationalMetrics();
  const payload = await metricsRegistry.metrics();
  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": metricsRegistry.contentType,
      "Cache-Control": "no-store",
    },
  });
}
