import { router } from "@/lib/trpc/trpc";
import { staffProblemsRouter } from "@/lib/trpc/router/staff/problems";
import { staffJudgeRouter } from "@/lib/trpc/router/staff/judge";
import { staffDiscussionsRouter } from "@/lib/trpc/router/staff/discussions";
import { staffEditorialsRouter } from "@/lib/trpc/router/staff/editorials";
import { staffTrailsRouter } from "@/lib/trpc/router/staff/trails";
import { staffContestsRouter } from "@/lib/trpc/router/staff/contests";

export const staffRouter = router({
  problems: staffProblemsRouter,
  judge: staffJudgeRouter,
  discussions: staffDiscussionsRouter,
  editorials: staffEditorialsRouter,
  trails: staffTrailsRouter,
  contests: staffContestsRouter,
});
