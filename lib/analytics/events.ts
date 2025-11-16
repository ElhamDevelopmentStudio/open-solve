export const ANALYTICS_EVENTS = [
  "problem.view_enter",
  "problem.view_exit",
  "problem.view_focus",
  "problem.view_blur",
  "problem.first_interaction",
  "problem.bounce_detected",
  "problem.scroll_depth",
  "problem.section_toggled",
  "problem.solve_clicked",
  "problem.hint_opened",
  "problem.editorial_opened",
  "problem.discuss_tab_opened",
  "problem.copy_action",
  "problem.share_link",
  "problem.report_issue",
  "problem.performance_metric",
  "problem.first_ac",
  "problem.abandoned",
  "problem.stuck",
  "editor.opened",
  "editor.focus",
  "editor.blur",
  "editor.activity_heartbeat",
  "editor.undo",
  "editor.redo",
  "editor.paste",
  "editor.language_switch",
  "editor.settings_changed",
  "editor.run_clicked",
  "editor.submit_clicked",
  "editor.draft_saved",
  "editor.freeze_detected",
  "editor.shortcut_used",
  "submission.error_summary",
  "submission.timeline_open",
  "navigation.path",
  "session.tab_blur",
  "session.tab_focus",
  "session.device_info",
  "layout.panel_resized",
  "layout.console_toggled",
  "layout.theme_toggled",
  "contest.problem_viewed",
  "contest.problem_switched",
  "contest.submit_clicked",
  "contest.time_on_problem",
  "contest.first_ac_in_contest",
  "library.search",
  "library.filters_change",
  "library.zero_results",
  "library.performance_metric",
  "network.request_failed",
  "client.error",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type BasePayload = Record<string, unknown>;

type AnalyticsPayloadDefinitions = {
  "problem.view_enter": {
    entrySource?: string;
    timeToVisibleMs?: number;
  };
  "problem.view_exit": {
    timeVisibleMs: number;
    timeActiveMs: number;
    interactionCount: number;
  };
  "problem.first_interaction": {
    timeToFirstInteractionMs: number;
  };
  "problem.bounce_detected": {
    reason: "noScroll" | "noSolve" | "noInteraction";
    timeVisibleMs: number;
  };
  "problem.scroll_depth": {
    maxScrollPercent: number;
  };
  "problem.section_toggled": {
    section: string;
    action: "expand" | "collapse";
  };
  "problem.solve_clicked": {
    source: string;
  };
  "problem.hint_opened": {
    timeSinceEnterMs?: number;
  };
  "problem.editorial_opened": {
    timeSinceEnterMs?: number;
  };
  "problem.discuss_tab_opened": {
    timeSinceEnterMs?: number;
  };
  "problem.copy_action": {
    field: string;
  };
  "problem.share_link": Record<string, never>;
  "problem.report_issue": Record<string, never>;
  "problem.performance_metric": {
    metric: string;
    value: number;
  };
  "problem.first_ac": {
    languageCode?: string;
    timeFromFirstViewMs: number;
    attemptsCount: number;
  };
  "problem.abandoned": {
    timeSpentMs: number;
    attemptsCount: number;
    hasRunCode: boolean;
    hasSubmitted: boolean;
  };
  "problem.stuck": {
    timeSpentMs: number;
    attemptsCount: number;
    hasHintOpened: boolean;
    hasEditorialOpened: boolean;
  };
  "editor.opened": {
    timeSinceEnterMs?: number;
  };
  "editor.activity_heartbeat": {
    activeMs: number;
    idleMs: number;
  };
  "editor.paste": {
    languageCode: string;
    pastedLength: number;
  };
  "editor.language_switch": {
    fromLanguageCode: string;
    toLanguageCode: string;
  };
  "editor.settings_changed": {
    fontSize?: number;
    theme?: string;
    wrapLines?: boolean;
    showMinimap?: boolean;
  };
  "editor.run_clicked": {
    runIndex: number;
    timeSinceEditorOpenMs: number;
  };
  "editor.submit_clicked": {
    attemptNumber: number;
    timeSinceFirstViewMs: number;
  };
  "editor.draft_saved": Record<string, never>;
  "submission.error_summary": {
    languageCode?: string;
    errorType: string;
    count: number;
  };
  "submission.timeline_open": {
    submissionId: string;
  };
  "navigation.path": {
    from?: string;
    to: string;
    timeOnFromMs?: number;
    origin?: string;
  };
  "session.device_info": {
    deviceType: "desktop" | "tablet" | "mobile";
    osFamily?: string;
    browserFamily?: string;
    viewport?: { width: number; height: number };
  };
  "layout.panel_resized": {
    problemId?: string;
    panel: string;
    size: number;
  };
  "layout.console_toggled": {
    problemId?: string;
    isOpen: boolean;
  };
  "layout.theme_toggled": {
    nextTheme: string;
  };
  "network.request_failed": {
    endpointName: string;
    statusCode?: number;
    errorType: "timeout" | "network" | "serverError";
  };
  "client.error": {
    route?: string;
    component?: string;
    errorMessage: string;
    stack?: string;
  };
  "library.search": {
    query: string;
  };
  "library.filters_change": {
    filters: unknown;
  };
  "library.zero_results": {
    filters: unknown;
  };
  "library.performance_metric": {
    metric: string;
    value: number;
  };
};

export type AnalyticsPayload<TName extends AnalyticsEventName> = TName extends keyof AnalyticsPayloadDefinitions
  ? AnalyticsPayloadDefinitions[TName]
  : BasePayload;
