import type { EditorialReleaseStrategy, ProblemState } from "@prisma/client";
import { addDays } from "date-fns";

type ReleaseSource = {
  editorialReleaseStrategy: EditorialReleaseStrategy;
  editorialReleaseAt: Date | null;
  editorialReleasedAt: Date | null;
  editorialReleaseOffsetDays: number | null;
  state: ProblemState;
  createdAt: Date;
  updatedAt: Date;
  contestProblems: Array<{ contest: { endsAt: Date | null } | null }>;
};

export type EditorialReleaseState = {
  releaseAt: Date | null;
  isReleased: boolean;
};

export function resolveEditorialRelease(problem: ReleaseSource): EditorialReleaseState {
  const releaseAt = determineReleaseAt(problem);
  const now = new Date();
  const isReleased =
    Boolean(problem.editorialReleasedAt && problem.editorialReleasedAt <= now) ||
    Boolean(releaseAt && releaseAt <= now);
  return {
    releaseAt: releaseAt ?? problem.editorialReleasedAt,
    isReleased,
  };
}

function determineReleaseAt(problem: ReleaseSource): Date | null {
  if (problem.editorialReleasedAt) {
    return problem.editorialReleasedAt;
  }
  if (problem.editorialReleaseAt) {
    return problem.editorialReleaseAt;
  }
  switch (problem.editorialReleaseStrategy) {
    case "ON_PUBLISH":
      return problem.state === "PUBLISHED" ? problem.updatedAt : null;
    case "OFFSET_DAYS":
      return problem.editorialReleaseOffsetDays != null
        ? addDays(problem.createdAt, problem.editorialReleaseOffsetDays)
        : null;
    case "AFTER_CONTEST": {
      const contest = problem.contestProblems[0]?.contest;
      return contest?.endsAt ?? null;
    }
    case "MANUAL":
    default:
      return null;
  }
}
