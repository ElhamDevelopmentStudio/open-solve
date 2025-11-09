import { router } from "@/lib/trpc/trpc";
import { staffProblemsRouter } from "@/lib/trpc/router/staff/problems";

export const staffRouter = router({
  problems: staffProblemsRouter,
});
