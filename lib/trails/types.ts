import type { TrailInsightCategory, TrailReportReason, UserRole } from "@prisma/client";

export type TrailInsightPayload = {
  id: string;
  content: string;
  category: TrailInsightCategory;
  score: number;
  isHidden: boolean;
  author: {
    id: string;
    handle: string;
    avatarUrl: string | null;
  };
  viewerVote: -1 | 0 | 1;
  createdAt: Date;
};

export type TrailEdgePayload = {
  id: string;
  fromInsightId: string;
  toInsightId: string;
  weight: number;
};

export type TrailGraphPayload = {
  insights: TrailInsightPayload[];
  edges: TrailEdgePayload[];
};

export type TrailViewer = {
  id: string;
  role: UserRole;
};

export type TrailReportInput = {
  insightId: string;
  reason: TrailReportReason;
  note?: string;
};
