import { ProblemReader } from "@/components/problems/problem-reader";
import type { ContestProblemAntiCheatContext } from "@/lib/contests/anti-cheat/types";
import { isStaffRole } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = { slug: string; label: string };

export default async function ContestProblemWorkspacePage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { slug, label } = await params;
  const session = await getSession();
  const viewerRole = session?.user.role;
  const isPrivilegedViewer = Boolean(viewerRole && isStaffRole(viewerRole));
  const caller = await createTRPCCaller();
  const contestDetail = await caller.contests.detail({ slug });
  const viewerRegistration = contestDetail.viewerRegistration;
  if (!viewerRegistration && !isPrivilegedViewer) {
    redirect(`/contests/${slug}`);
  }
  const contestProblem = contestDetail.problems.find(
    (entry) => entry.label.toLowerCase() === label.toLowerCase(),
  );
  if (!contestProblem) {
    notFound();
  }
  const problem = await caller.problems.detail({ slug: contestProblem.slug });
  const contestContext: ContestProblemAntiCheatContext | undefined = viewerRegistration
    ? {
        contestId: contestDetail.contest.id,
        contestSlug: slug,
        contestName: contestDetail.contest.name,
        contestType: contestDetail.contest.type,
        registrationId: viewerRegistration.id,
        problemId: problem.id,
        problemLabel: contestProblem.label,
        antiCheat: contestDetail.contest.settings.antiCheat,
      }
    : undefined;
  return <ProblemReader problem={problem} contestContext={contestContext} />;
}
