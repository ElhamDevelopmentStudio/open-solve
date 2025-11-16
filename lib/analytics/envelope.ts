import type { AnalyticsEventName, AnalyticsPayload } from "@/lib/analytics/events";

export type AnalyticsContextPayload = {
  problemId?: string;
  contestId?: string;
  languageCode?: string;
  route?: string;
  deviceType?: "desktop" | "tablet" | "mobile";
  osFamily?: string;
  browserFamily?: string;
  viewport?: {
    width: number;
    height: number;
  };
};

export type AnalyticsEventEnvelope<TName extends AnalyticsEventName = AnalyticsEventName> = {
  eventName: TName;
  version?: number;
  timestamp?: string;
  sessionId?: string;
  context?: AnalyticsContextPayload;
  payload?: AnalyticsPayload<TName>;
};
