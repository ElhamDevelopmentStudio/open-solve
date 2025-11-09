import { ProblemEditorShell } from "@/components/staff/problems/problem-editor-shell";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";

export default async function StaffProblemEditorPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolved = await params;
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery("staff.problems.get", () => caller.staff.problems.get({ id: resolved.id }), {
      input: { id: resolved.id },
    }),
    prefetchTrpcQuery("problems.filterMetadata", () => caller.problems.filterMetadata()),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ProblemEditorShell problemId={resolved.id} />
    </HydrationBoundary>
  );
}
