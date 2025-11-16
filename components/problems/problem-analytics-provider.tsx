"use client";

import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type ProblemAnalyticsState = {
  enteredAt: number;
  interactionCount: number;
  activeMs: number;
  lastInteractionAt: number | null;
  firstInteractionSent: boolean;
  maxScrollPercent: number;
  hasSolveClicked: boolean;
  hasHintOpened: boolean;
  hasEditorialOpened: boolean;
  hasDiscussOpened: boolean;
  hasEditorOpened: boolean;
  runs: number;
  submits: number;
  hasAccepted: boolean;
  exitSent: boolean;
  stuckEmitted: boolean;
};

type ProblemAnalyticsContextValue = {
  problemId: string;
  getTimeSinceEnterMs: () => number;
  markSolveClick: (source: string) => void;
  markHintOpen: () => void;
  markEditorialOpen: () => void;
  markDiscussOpen: () => void;
  markSectionToggle: (section: string, action: "expand" | "collapse") => void;
  registerEditorOpen: () => void;
  incrementRunCount: () => void;
  incrementSubmitCount: () => void;
  markAccepted: (languageCode?: string) => void;
  emitErrorSummary: (errorType: string, count: number, languageCode?: string) => void;
  hasHintOpened: () => boolean;
  hasEditorialOpened: () => boolean;
  hasSolveIntent: () => boolean;
};

const ProblemAnalyticsContext = createContext<ProblemAnalyticsContextValue | null>(null);

export function ProblemAnalyticsProvider({
  problemId,
  children,
}: {
  problemId: string;
  children: ReactNode;
}) {
  const stateRef = useRef<ProblemAnalyticsState>({
    enteredAt: now(),
    interactionCount: 0,
    activeMs: 0,
    lastInteractionAt: null,
    firstInteractionSent: false,
    maxScrollPercent: 0,
    hasSolveClicked: false,
    hasHintOpened: false,
    hasEditorialOpened: false,
    hasDiscussOpened: false,
    hasEditorOpened: false,
    runs: 0,
    submits: 0,
    hasAccepted: false,
    exitSent: false,
    stuckEmitted: false,
  });

  useEffect(() => {
    const state = stateRef.current;
    state.enteredAt = now();
    trackAnalyticsEvent("problem.view_enter", {}, { problemId });

    const handleFocus = () => trackAnalyticsEvent("problem.view_focus", {}, { problemId });
    const handleBlur = () => trackAnalyticsEvent("problem.view_blur", {}, { problemId });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleFocus();
      } else {
        handleBlur();
      }
    };
    const handleInteraction = () => {
      const timestamp = now();
      if (state.lastInteractionAt) {
        state.activeMs += Math.min(timestamp - state.lastInteractionAt, 15000);
      }
      state.lastInteractionAt = timestamp;
      state.interactionCount += 1;
      if (!state.firstInteractionSent) {
        state.firstInteractionSent = true;
        trackAnalyticsEvent(
          "problem.first_interaction",
          {
            timeToFirstInteractionMs: Math.round(timestamp - state.enteredAt),
          },
          { problemId },
        );
      }
    };

    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = Math.round((window.scrollY / scrollable) * 100);
      if (percent > state.maxScrollPercent) {
        state.maxScrollPercent = Math.min(100, percent);
      }
    };

    const handleExit = () => flushViewExit(problemId, stateRef.current);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("pointerdown", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleExit);
    window.addEventListener("pagehide", handleExit);

    return () => {
      flushViewExit(problemId, stateRef.current);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("pointerdown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleExit);
      window.removeEventListener("pagehide", handleExit);
    };
  }, [problemId]);

  const contextValue = useMemo<ProblemAnalyticsContextValue>(() => {
    return {
      problemId,
      getTimeSinceEnterMs: () => Math.round(now() - stateRef.current.enteredAt),
      markSolveClick: (source) => {
        stateRef.current.hasSolveClicked = true;
        trackAnalyticsEvent(
          "problem.solve_clicked",
          { source },
          { problemId },
        );
      },
      markHintOpen: () => {
        stateRef.current.hasHintOpened = true;
        trackAnalyticsEvent(
          "problem.hint_opened",
          { timeSinceEnterMs: Math.round(now() - stateRef.current.enteredAt) },
          { problemId },
        );
      },
      markEditorialOpen: () => {
        stateRef.current.hasEditorialOpened = true;
        trackAnalyticsEvent(
          "problem.editorial_opened",
          { timeSinceEnterMs: Math.round(now() - stateRef.current.enteredAt) },
          { problemId },
        );
      },
      markDiscussOpen: () => {
        stateRef.current.hasDiscussOpened = true;
        trackAnalyticsEvent(
          "problem.discuss_tab_opened",
          { timeSinceEnterMs: Math.round(now() - stateRef.current.enteredAt) },
          { problemId },
        );
      },
      markSectionToggle: (section, action) => {
        trackAnalyticsEvent("problem.section_toggled", { section, action }, { problemId });
      },
      registerEditorOpen: () => {
        stateRef.current.hasEditorOpened = true;
      },
      incrementRunCount: () => {
        stateRef.current.runs += 1;
      },
      incrementSubmitCount: () => {
        stateRef.current.submits += 1;
        maybeEmitStuck(problemId, stateRef.current);
      },
      markAccepted: (languageCode) => {
        if (stateRef.current.hasAccepted) return;
        stateRef.current.hasAccepted = true;
        trackAnalyticsEvent(
          "problem.first_ac",
          {
            languageCode,
            attemptsCount: stateRef.current.submits,
            timeFromFirstViewMs: Math.round(now() - stateRef.current.enteredAt),
          },
          { problemId },
        );
      },
      emitErrorSummary: (errorType, count, languageCode) => {
        trackAnalyticsEvent(
          "submission.error_summary",
          { languageCode, errorType, count },
          { problemId },
        );
      },
      hasHintOpened: () => stateRef.current.hasHintOpened,
      hasEditorialOpened: () => stateRef.current.hasEditorialOpened,
      hasSolveIntent: () =>
        stateRef.current.hasSolveClicked ||
        stateRef.current.hasHintOpened ||
        stateRef.current.runs > 0 ||
        stateRef.current.submits > 0,
    };
  }, [problemId]);

  return (
    <ProblemAnalyticsContext.Provider value={contextValue}>
      {children}
    </ProblemAnalyticsContext.Provider>
  );
}

export function useProblemAnalyticsContext() {
  const ctx = useContext(ProblemAnalyticsContext);
  if (!ctx) {
    throw new Error("useProblemAnalyticsContext must be used within ProblemAnalyticsProvider");
  }
  return ctx;
}

function flushViewExit(problemId: string, state: ProblemAnalyticsState) {
  if (state.exitSent) return;
  state.exitSent = true;
  const timestamp = now();
  const timeVisibleMs = Math.max(0, timestamp - state.enteredAt);
  trackAnalyticsEvent(
    "problem.view_exit",
    {
      timeVisibleMs: Math.round(timeVisibleMs),
      timeActiveMs: Math.round(state.activeMs),
      interactionCount: state.interactionCount,
    },
    { problemId },
  );
  trackAnalyticsEvent(
    "problem.scroll_depth",
    {
      maxScrollPercent: Math.min(100, state.maxScrollPercent),
    },
    { problemId },
  );

  if (!state.hasAccepted && (state.runs > 0 || state.submits > 0)) {
    trackAnalyticsEvent(
      "problem.abandoned",
      {
        timeSpentMs: Math.round(timeVisibleMs),
        attemptsCount: state.submits,
        hasRunCode: state.runs > 0,
        hasSubmitted: state.submits > 0,
      },
      { problemId },
    );
  }

  const bounceReason = resolveBounceReason(state);
  if (bounceReason) {
    trackAnalyticsEvent(
      "problem.bounce_detected",
      {
        reason: bounceReason,
        timeVisibleMs: Math.round(timeVisibleMs),
      },
      { problemId },
    );
  }
}

function resolveBounceReason(state: ProblemAnalyticsState): "noScroll" | "noSolve" | "noInteraction" | null {
  if (state.maxScrollPercent < 25) {
    return "noScroll";
  }
  if (state.interactionCount === 0) {
    return "noInteraction";
  }
  if (!state.hasSolveClicked && !state.hasHintOpened && state.submits === 0 && state.runs === 0) {
    return "noSolve";
  }
  return null;
}

function maybeEmitStuck(problemId: string, state: ProblemAnalyticsState) {
  if (state.stuckEmitted) return;
  if (state.submits < 3 || state.hasAccepted) {
    return;
  }
  const timeSpentMs = now() - state.enteredAt;
  if (timeSpentMs < 5 * 60 * 1000) {
    return;
  }
  if (state.hasHintOpened || state.hasEditorialOpened) {
    return;
  }
  state.stuckEmitted = true;
  trackAnalyticsEvent(
    "problem.stuck",
    {
      timeSpentMs: Math.round(timeSpentMs),
      attemptsCount: state.submits,
      hasHintOpened: state.hasHintOpened,
      hasEditorialOpened: state.hasEditorialOpened,
    },
    { problemId },
  );
}

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
