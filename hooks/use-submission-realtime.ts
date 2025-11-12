"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SubmissionDetailPayload } from "@/lib/submissions/types";

type SubmissionRealtimeOptions = {
  submissionId: string | null;
  onUpdate: (detail: SubmissionDetailPayload) => void;
};

type SubmissionServerEvent =
  | { type: "ready" }
  | { type: "subscribed"; submissionId: string }
  | { type: "unsubscribed"; submissionId: string }
  | { type: "update"; submissionId: string; payload: SubmissionDetailPayload }
  | { type: "error"; submissionId?: string; message: string };

const ensureRealtimeServerReady = (() => {
  let bootstrapPromise: Promise<void> | null = null;
  return () => {
    if (!bootstrapPromise) {
      bootstrapPromise = fetch("/api/ws/submissions")
        .then(() => undefined)
        .catch((error) => {
          bootstrapPromise = null;
          throw error;
        });
    }
    return bootstrapPromise;
  };
})();

export function useSubmissionRealtime({ submissionId, onUpdate }: SubmissionRealtimeOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const desiredRef = useRef<string | null>(submissionId);
  const activeRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncSubscription = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const desired = desiredRef.current;
    const active = activeRef.current;
    if (desired && desired !== active) {
      if (active) {
        ws.send(JSON.stringify({ type: "unsubscribe", submissionId: active }));
      }
      ws.send(JSON.stringify({ type: "subscribe", submissionId: desired }));
    } else if (!desired && active) {
      ws.send(JSON.stringify({ type: "unsubscribe", submissionId: active }));
    }
  }, []);

  useEffect(() => {
    desiredRef.current = submissionId;
    syncSubscription();
  }, [submissionId, syncSubscription]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    let backoff = 1_000;

    const handleServerMessage = (message: SubmissionServerEvent) => {
      switch (message.type) {
        case "subscribed":
          activeRef.current = message.submissionId;
          break;
        case "unsubscribed":
          if (activeRef.current === message.submissionId) {
            activeRef.current = null;
          }
          break;
        case "update":
          onUpdateRef.current?.(message.payload);
          break;
        case "ready":
          syncSubscription();
          break;
        case "error":
        default:
          break;
      }
    };

    const cleanupSocket = () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        backoff = Math.min(backoff * 1.5, 10_000);
        void connect();
      }, backoff);
    };

    const connect = async () => {
      if (cancelled) return;
      try {
        await ensureRealtimeServerReady();
      } catch {
        scheduleReconnect();
        return;
      }
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/api/ws/submissions`);
      wsRef.current = socket;

      socket.addEventListener("open", () => {
        if (cancelled) return;
        backoff = 1_000;
        syncSubscription();
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data) as SubmissionServerEvent;
          handleServerMessage(message);
        } catch (error) {
          console.error("Failed to parse realtime payload", error);
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      cleanupSocket();
      activeRef.current = null;
    };
  }, [syncSubscription]);
}
