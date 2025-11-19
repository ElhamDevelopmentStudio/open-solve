"use client";

import { useEffect, useRef } from "react";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";

type LeaderboardServerEvent =
  | { type: "ready" }
  | { type: "update"; windows: LeaderboardWindow[]; at: string };

const ensureLeaderboardServerReady = (() => {
  let bootstrapPromise: Promise<void> | null = null;
  return () => {
    if (!bootstrapPromise) {
      bootstrapPromise = fetch("/api/ws/leaderboard")
        .then(() => undefined)
        .catch((error) => {
          bootstrapPromise = null;
          throw error;
        });
    }
    return bootstrapPromise;
  };
})();

export function useLeaderboardRealtime(onUpdate: (window: LeaderboardWindow) => void) {
  const handlerRef = useRef(onUpdate);

  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let backoff = 1_000;
    let socket: WebSocket | null = null;

    const cleanup = () => {
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
        socket = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = setTimeout(() => {
        backoff = Math.min(backoff * 1.5, 10_000);
        void connect();
      }, backoff);
    };

    const handleMessage = (payload: LeaderboardServerEvent) => {
      if (payload.type !== "update") {
        return;
      }
      for (const windowName of payload.windows) {
        handlerRef.current?.(windowName);
      }
    };

    const connect = async () => {
      if (cancelled) return;
      try {
        await ensureLeaderboardServerReady();
      } catch {
        scheduleReconnect();
        return;
      }
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/api/ws/leaderboard`);

      socket.addEventListener("open", () => {
        backoff = 1_000;
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data) as LeaderboardServerEvent;
          handleMessage(payload);
        } catch (error) {
          console.error("Failed to parse leaderboard realtime payload", error);
        }
      });

      const handleClose = () => {
        if (cancelled) return;
        scheduleReconnect();
      };

      socket.addEventListener("close", handleClose);
      socket.addEventListener("error", handleClose);
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      cleanup();
    };
  }, []);
}
