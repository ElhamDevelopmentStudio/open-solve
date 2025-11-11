import { router } from "@/lib/trpc/trpc";
import { staffProblemsRouter } from "@/lib/trpc/router/staff/problems";
import { staffJudgeRouter } from "@/lib/trpc/router/staff/judge";

export const staffRouter = router({
  problems: staffProblemsRouter,
  judge: staffJudgeRouter,
});
