import { ContestAntiCheatDashboard } from "@/components/admin/contests/contest-anti-cheat-dashboard";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export default async function AdminContestAntiCheatPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  let contestDetail;
  try {
    contestDetail = await caller.contests.detail({ slug });
  } catch {
    notFound();
  }
  if (!contestDetail) {
    notFound();
  }
  const participants = await caller.admin.antiCheat.participants({
    contestId: contestDetail.contest.id,
  });
  return (
    <ContestAntiCheatDashboard
      contest={{
        id: contestDetail.contest.id,
        name: contestDetail.contest.name,
        slug: contestDetail.contest.slug,
        state: contestDetail.contest.state,
        type: contestDetail.contest.type,
      }}
      initialParticipants={participants}
    />
  );
}
