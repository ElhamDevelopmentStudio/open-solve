"use client";

import type { AnalyticsContextPayload, AnalyticsEventEnvelope } from "@/lib/analytics/envelope";
import { ANALYTICS_EVENTS, type AnalyticsEventName, type AnalyticsPayload } from "@/lib/analytics/events";

const ANALYTICS_ENDPOINT = "/api/analytics";
const SESSION_STORAGE_KEY = "opensolve:analyticsSessionId";
const DEVICE_INFO_STORAGE_KEY = "opensolve:deviceInfo";

type DeviceSnapshot = {
  deviceType: "desktop" | "tablet" | "mobile";
  osFamily?: string;
  browserFamily?: string;
};

let cachedSessionId: string | null = null;
let cachedDeviceInfo: DeviceSnapshot | null = null;

const encoder = new TextEncoder();

export function trackAnalyticsEvent<TName extends AnalyticsEventName>(
  eventName: TName,
  payload: AnalyticsPayload<TName> = {} as AnalyticsPayload<TName>,
  context?: AnalyticsContextPayload,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (process.env.NODE_ENV !== "production" && !ANALYTICS_EVENTS.includes(eventName)) {
    console.warn(`[analytics] Unknown event "${eventName}"`);
  }

  const sessionId = ensureSessionId();
  const deviceInfo = ensureDeviceInfo();
  const viewport = readViewport();

  const envelope: AnalyticsEventEnvelope<TName> = {
    eventName,
    version: 1,
    sessionId,
    timestamp: new Date().toISOString(),
    context: {
      route: context?.route ?? window.location.pathname,
      problemId: context?.problemId,
      contestId: context?.contestId,
      languageCode: context?.languageCode,
      deviceType: context?.deviceType ?? deviceInfo.deviceType,
      osFamily: context?.osFamily ?? deviceInfo.osFamily,
      browserFamily: context?.browserFamily ?? deviceInfo.browserFamily,
      viewport: context?.viewport ?? viewport,
    },
    payload,
  };

  const body = JSON.stringify(envelope);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([encoder.encode(body)], { type: "application/json" });
      navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
    } else {
      void fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // ignore analytics failures
  }
}

function ensureSessionId() {
  if (cachedSessionId) {
    return cachedSessionId;
  }

  if (typeof window === "undefined") {
    return "server";
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }
  } catch {
    // ignore storage errors
  }

  const id = createSessionId();

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }

  cachedSessionId = id;
  return id;
}

export function getAnalyticsDeviceSnapshot(): DeviceSnapshot {
  return ensureDeviceInfo();
}

export function getAnalyticsSessionId() {
  return ensureSessionId();
}

function ensureDeviceInfo(): DeviceSnapshot {
  if (cachedDeviceInfo) {
    return cachedDeviceInfo;
  }
  let snapshot: DeviceSnapshot = {
    deviceType: "desktop",
  };

  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    snapshot = {
      deviceType: detectDeviceType(ua),
      osFamily: detectOsFamily(ua),
      browserFamily: detectBrowserFamily(ua),
    };
  }

  cachedDeviceInfo = snapshot;
  try {
    window.sessionStorage.setItem(DEVICE_INFO_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
  return snapshot;
}

function detectDeviceType(userAgent: string): DeviceSnapshot["deviceType"] {
  if (/ipad|tablet/.test(userAgent)) {
    return "tablet";
  }
  if (/mobi|android/.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

function detectOsFamily(userAgent: string) {
  if (userAgent.includes("windows")) return "windows";
  if (userAgent.includes("mac os")) return "mac";
  if (userAgent.includes("android")) return "android";
  if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "ios";
  if (userAgent.includes("linux")) return "linux";
  return undefined;
}

function detectBrowserFamily(userAgent: string) {
  if (userAgent.includes("edg/")) return "edge";
  if (userAgent.includes("chrome/")) return "chrome";
  if (userAgent.includes("safari/") && !userAgent.includes("chrome/")) return "safari";
  if (userAgent.includes("firefox/")) return "firefox";
  return undefined;
}

function readViewport() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return {
    width: Math.round(window.innerWidth),
    height: Math.round(window.innerHeight),
  };
}

function createSessionId() {
  const cryptoObj = typeof globalThis !== "undefined" && globalThis.crypto ? globalThis.crypto : undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  if (cryptoObj?.getRandomValues) {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `session-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
