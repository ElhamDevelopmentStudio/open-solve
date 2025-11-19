import type { EditorialReleaseStrategy } from "@prisma/client";

export type EditorialPayload = {
  problemId: string;
  version: number;
  content: string | null;
  isReleased: boolean;
  releaseAt: Date | null;
  strategy: EditorialReleaseStrategy;
};

export type EditorialScheduleInput = {
  problemId: string;
  content: string;
  releaseStrategy: EditorialReleaseStrategy;
  releaseAt?: Date | null;
  offsetDays?: number | null;
  contestId?: string | null;
  publishNow?: boolean;
};
