import {
  computeAnalyticsOverview,
  computeProblemAnalyticsSnapshots,
} from "@/lib/analytics/queries";
import { adminProcedure, router } from "@/lib/trpc/trpc";

export const adminAnalyticsRouter = router({
  overview: adminProcedure.query(async () => computeAnalyticsOverview()),
  problems: adminProcedure.query(async () => computeProblemAnalyticsSnapshots()),
});
