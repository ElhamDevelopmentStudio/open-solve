"use client";

import type { TelemetryEvent } from "@/lib/telemetry/events";

const ENDPOINT = "/api/telemetry";

export type TelemetryPayload = Record<string, unknown>;

export function trackEvent(event: TelemetryEvent, payload: TelemetryPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    event,
    payload,
    path: window.location.pathname,
    timestamp: Date.now(),
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Ignore telemetry failures
  }
}
