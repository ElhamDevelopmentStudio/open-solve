export const TELEMETRY_EVENTS = [
  "problems.search",
  "problems.filters.change",
  "problems.zeroResults",
  "problems.performance",
  "problemDetail.copy",
  "problemDetail.anchor",
  "problemDetail.share",
  "problemDetail.relatedClick",
  "problemDetail.scrollDepth",
  "problemDetail.startSolving",
  "problemDetail.performance",
  "problemDetail.report",
  "submission.runSample",
  "submission.create",
  "submission.timeline.open",
  "submission.draft.saved",
  "submission.draft.restored",
] as const;

export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number];
