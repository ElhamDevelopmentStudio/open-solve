import type { ContestSettings } from "@/lib/contests/schema";
import type { ContestAntiCheatFlagStatus, ContestType } from "@prisma/client";

export type ContestProblemAntiCheatContext = {
  contestId: string;
  contestSlug: string;
  contestName: string;
  contestType: ContestType;
  registrationId: string;
  problemId: string;
  problemLabel: string;
  antiCheat: ContestSettings["antiCheat"];
};

type DeviceSnapshot = {
  deviceType: "desktop" | "tablet" | "mobile";
  osFamily?: string;
  browserFamily?: string;
  viewport?: {
    width: number;
    height: number;
  };
  connectionType?: string;
};

type BaseEvent = {
  sessionId: string;
  occurredAt?: string;
  problemId?: string;
  label?: string;
};

export type ContestAntiCheatClientEvent =
  | (BaseEvent &
      DeviceSnapshot & {
        type: "session_start";
      })
  | (BaseEvent & {
      type: "session_end";
      reason?: string;
    })
  | (BaseEvent & {
      type: "focus_metrics";
      delta?: {
        tabSwitches?: number;
        outOfFocusMs?: number;
        maxConsecutiveOutMs?: number;
      };
    })
  | (BaseEvent & {
      type: "paste";
      pastedLength: number;
    });

export type ContestAntiCheatIngestResponse = {
  warnings: string[];
  flagged: boolean;
  disqualified: boolean;
  status: ContestAntiCheatFlagStatus;
  ignored?: boolean;
};
