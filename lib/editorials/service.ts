import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/auth/permissions";
import type { EditorialPayload, EditorialScheduleInput } from "@/lib/editorials/types";
import type { Prisma, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import { resolveEditorialRelease } from "@/lib/editorials/release";

type Viewer = { id: string; role: UserRole } | null;

export async function getEditorialByProblem(params: {
  problemId?: string;
  slug?: string;
  viewer: Viewer;
}): Promise<EditorialPayload | null> {
  const problem = await prisma.problem.findFirst({
    where: params.problemId ? { id: params.problemId } : { slug: params.slug },
    include: {
      currentVersion: {
        select: { id: true, versionNumber: true, editorial: true, updatedAt: true },
      },
      contestProblems: {
        take: 1,
        include: {
          contest: { select: { endsAt: true } },
        },
      },
    },
  });
  if (!problem || !problem.currentVersion?.editorial) {
    return null;
  }
  const releaseState = resolveEditorialRelease(problem);
  const viewerIsStaff = params.viewer ? isStaffRole(params.viewer.role) : false;
  const isReleased = viewerIsStaff || releaseState.isReleased;
  return {
    problemId: problem.id,
    version: problem.currentVersion.versionNumber,
    content: isReleased ? problem.currentVersion.editorial : null,
    isReleased,
    releaseAt: releaseState.releaseAt,
    strategy: problem.editorialReleaseStrategy,
  };
}

export async function saveEditorialSchedule(input: EditorialScheduleInput) {
  const problem = await prisma.problem.findUnique({
    where: { id: input.problemId },
    select: { id: true, currentVersionId: true },
  });
  if (!problem?.currentVersionId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
  }
  const content = input.content.trim();
  if (!content) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Editorial content is required" });
  }
  const releaseData = await buildReleaseData(input);
  await prisma.$transaction([
    prisma.problemVersion.update({
      where: { id: problem.currentVersionId },
      data: { editorial: content },
    }),
    prisma.problem.update({
      where: { id: input.problemId },
      data: releaseData,
    }),
  ]);
}

export async function publishEditorialNow(problemId: string) {
  await prisma.problem.update({
    where: { id: problemId },
    data: {
      editorialReleaseStrategy: "MANUAL",
      editorialReleaseAt: new Date(),
      editorialReleasedAt: new Date(),
    },
  });
}

async function buildReleaseData(input: EditorialScheduleInput) {
  let releaseAt: Date | null = null;
  let contestId: string | null = null;
  let offsetDays: number | null = null;
  switch (input.releaseStrategy) {
    case "MANUAL":
      if (!input.releaseAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Manual release requires a datetime" });
      }
      releaseAt = input.releaseAt;
      break;
    case "OFFSET_DAYS":
      if (typeof input.offsetDays !== "number") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Offset strategy requires days value",
        });
      }
      offsetDays = input.offsetDays;
      releaseAt = input.releaseAt ?? addDays(new Date(), offsetDays);
      break;
    case "AFTER_CONTEST":
      if (!input.contestId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contest release requires a contest" });
      }
      contestId = input.contestId;
      if (input.releaseAt) {
        releaseAt = input.releaseAt;
      } else {
        const contest = await prisma.contest.findUnique({
          where: { id: contestId },
          select: { endsAt: true },
        });
        releaseAt = contest?.endsAt ?? null;
      }
      break;
    case "ON_PUBLISH":
    default:
      releaseAt = input.releaseAt ?? null;
      break;
  }
  if (input.publishNow) {
    releaseAt = new Date();
  }
  const releaseEffective = input.publishNow
    ? new Date()
    : releaseAt && releaseAt <= new Date()
      ? releaseAt
      : null;
  const payload: Prisma.ProblemUpdateInput = {
    editorialReleaseStrategy: input.releaseStrategy,
    editorialReleaseAt: releaseAt,
    editorialReleasedAt: releaseEffective,
    editorialReleaseOffsetDays: offsetDays,
    editorialReleaseContest: contestId ? { connect: { id: contestId } } : { disconnect: true },
  };
  return payload;
}
