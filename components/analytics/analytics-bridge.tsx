"use client";

import { getAnalyticsDeviceSnapshot, trackAnalyticsEvent } from "@/lib/analytics/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function AnalyticsBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteRef = useRef<string | null>(null);
  const lastVisitedAtRef = useRef<number>(Date.now());
  const isInitialisedRef = useRef(false);

  useEffect(() => {
    if (isInitialisedRef.current) return;
    isInitialisedRef.current = true;
    const snapshot = getAnalyticsDeviceSnapshot();
    trackAnalyticsEvent("session.device_info", {
      deviceType: snapshot.deviceType,
      osFamily: snapshot.osFamily,
      browserFamily: snapshot.browserFamily,
      viewport:
        typeof window !== "undefined"
          ? { width: window.innerWidth, height: window.innerHeight }
          : undefined,
    });

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        trackAnalyticsEvent("session.tab_blur", {
          route: buildRoute(pathname, searchParams?.toString()),
        });
      } else {
        trackAnalyticsEvent("session.tab_focus", {
          route: buildRoute(pathname, searchParams?.toString()),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pathname, searchParams]);

  useEffect(() => {
    const now = Date.now();
    const currentRoute = buildRoute(pathname, searchParams?.toString());
    const prevRoute = lastRouteRef.current;
    const timeOnFromMs = now - (lastVisitedAtRef.current ?? now);

    if (prevRoute) {
      trackAnalyticsEvent("navigation.path", {
        from: prevRoute,
        to: currentRoute,
        timeOnFromMs,
        origin: document.referrer || undefined,
      });
    }

    lastRouteRef.current = currentRoute;
    lastVisitedAtRef.current = now;
  }, [pathname, searchParams]);

  return null;
}

function buildRoute(pathname: string | null, search?: string | null) {
  if (!pathname) return "/";
  if (!search) return pathname;
  return search.length > 0 ? `${pathname}?${search}` : pathname;
}
