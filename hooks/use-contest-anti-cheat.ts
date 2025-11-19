import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAnalyticsDeviceSnapshot, getAnalyticsSessionId } from "@/lib/analytics/client";
import type {
  ContestProblemAntiCheatContext,
  ContestAntiCheatClientEvent,
} from "@/lib/contests/anti-cheat/types";
import type { ContestAntiCheatFlagStatus } from "@prisma/client";

type HookResult = {
  enabled: boolean;
  warnings: string[];
  status: ContestAntiCheatFlagStatus | null;
  disqualified: boolean;
  recordPaste: (length: number) => void;
  examMode: {
    disableSelection: boolean;
    disableContextMenu: boolean;
    stickyReminder: boolean;
  };
};

const noop: HookResult = {
  enabled: false,
  warnings: [],
  status: null,
  disqualified: false,
  recordPaste: () => {},
  examMode: {
    disableSelection: false,
    disableContextMenu: false,
    stickyReminder: false,
  },
};

export function useContestAntiCheat(contestContext?: ContestProblemAntiCheatContext): HookResult {
  const guardEnabled = Boolean(contestContext && contestContext.antiCheat.enabled);
  const sessionId = useMemo(() => (guardEnabled ? getAnalyticsSessionId() : null), [guardEnabled]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<ContestAntiCheatFlagStatus | null>(null);
  const [disqualified, setDisqualified] = useState(false);
  const queueRef = useRef<ContestAntiCheatClientEvent[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);
  const blurStartedAt = useRef<number | null>(null);
  const endpoint = contestContext ? `/api/contests/${contestContext.contestId}/anti-cheat` : null;

  const updateWarnings = useCallback((messages: string[]) => {
    if (!messages.length) return;
    setWarnings((prev) => {
      const merged = [...prev, ...messages];
      return Array.from(new Set(merged)).slice(-4);
    });
  }, []);

  const sendBatch = useCallback(
    async (batch: ContestAntiCheatClientEvent[], parseResponse = true) => {
      if (!endpoint || batch.length === 0) return;
      const body = JSON.stringify(batch);
      if (!parseResponse && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      }
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.warnings)) {
          updateWarnings(data.warnings);
        }
        if (typeof data.status === "string") {
          setStatus(data.status);
        }
        if (data.disqualified) {
          setDisqualified(true);
        }
      } catch {
        // ignore network failures
      }
    },
    [endpoint, updateWarnings],
  );

  const flushQueue = useCallback(
    async (options?: { keepaliveOnly?: boolean }) => {
      if (!contestContext || queueRef.current.length === 0) {
        return;
      }
      const payload = queueRef.current.splice(0, queueRef.current.length);
      await sendBatch(payload, !options?.keepaliveOnly);
    },
    [contestContext, sendBatch],
  );

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushQueue().finally(() => {
        if (flushTimer.current) {
          clearTimeout(flushTimer.current);
          flushTimer.current = null;
        }
      });
    }, 1200);
  }, [flushQueue]);

  const enqueueEvent = useCallback(
    (event: ContestAntiCheatClientEvent) => {
      if (!guardEnabled || !sessionId) return;
      queueRef.current.push(event);
      if (queueRef.current.length >= 6) {
        void flushQueue();
      } else {
        scheduleFlush();
      }
    },
    [guardEnabled, sessionId, flushQueue, scheduleFlush],
  );

  useEffect(() => {
    if (!contestContext || !guardEnabled || !sessionId) return;
    const device = getAnalyticsDeviceSnapshot();
    const connectionType =
      typeof navigator !== "undefined" && "connection" in navigator
        ? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
            ?.effectiveType
        : undefined;
    enqueueEvent({
      type: "session_start",
      sessionId,
      deviceType: device.deviceType,
      osFamily: device.osFamily,
      browserFamily: device.browserFamily,
      viewport:
        typeof window !== "undefined"
          ? { width: window.innerWidth, height: window.innerHeight }
          : undefined,
      connectionType,
      problemId: contestContext.problemId,
    });
    const handleBlur = () => {
      blurStartedAt.current = Date.now();
    };
    const handleFocus = () => {
      if (blurStartedAt.current) {
        const delta = Date.now() - blurStartedAt.current;
        enqueueEvent({
          type: "focus_metrics",
          sessionId,
          problemId: contestContext.problemId,
          delta: {
            tabSwitches: 1,
            outOfFocusMs: delta,
            maxConsecutiveOutMs: delta,
          },
        });
        blurStartedAt.current = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        blurStartedAt.current = Date.now();
      } else {
        handleFocus();
      }
    };
    const handleUnload = () => {
      void flushQueue({ keepaliveOnly: true });
      enqueueEvent({
        type: "session_end",
        sessionId,
        reason: "unload",
        problemId: contestContext.problemId,
      });
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      void flushQueue({ keepaliveOnly: true });
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [contestContext, enqueueEvent, flushQueue, guardEnabled, sessionId]);

  useEffect(() => {
    if (!guardEnabled || !contestContext?.antiCheat.examMode.disableContextMenu) {
      return;
    }
    const handler = (event: Event) => event.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [contestContext?.antiCheat.examMode.disableContextMenu, guardEnabled]);

  const recordPaste = useCallback(
    (length: number) => {
      if (!contestContext || !guardEnabled || !sessionId) return;
      enqueueEvent({
        type: "paste",
        sessionId,
        problemId: contestContext.problemId,
        pastedLength: length,
      });
    },
    [contestContext, guardEnabled, sessionId, enqueueEvent],
  );

  if (!guardEnabled || !contestContext) {
    return noop;
  }
  return {
    enabled: true,
    warnings,
    status,
    disqualified,
    recordPaste,
    examMode: {
      disableSelection: contestContext.antiCheat.examMode.disableSelection,
      disableContextMenu: contestContext.antiCheat.examMode.disableContextMenu,
      stickyReminder: contestContext.antiCheat.examMode.stickyReminder,
    },
  };
}
