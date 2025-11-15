import { router } from "@/lib/trpc/trpc";
import { adminDashboardRouter } from "@/lib/trpc/router/admin/dashboard";
import { adminUsersRouter } from "@/lib/trpc/router/admin/users";
import { adminProblemsRouter } from "@/lib/trpc/router/admin/problems";
import { adminSubmissionsRouter } from "@/lib/trpc/router/admin/submissions";
import { adminSystemRouter } from "@/lib/trpc/router/admin/system";
import { adminFeatureFlagsRouter } from "@/lib/trpc/router/admin/flags";
import { adminAuditRouter } from "@/lib/trpc/router/admin/audit";
import { adminImpersonationRouter } from "@/lib/trpc/router/admin/impersonation";
import { adminDiscussionsRouter } from "@/lib/trpc/router/admin/discussions";
import { adminContestsRouter } from "@/lib/trpc/router/admin/contests";

export const adminRouter = router({
  dashboard: adminDashboardRouter,
  users: adminUsersRouter,
  problems: adminProblemsRouter,
  submissions: adminSubmissionsRouter,
  system: adminSystemRouter,
  flags: adminFeatureFlagsRouter,
  audit: adminAuditRouter,
  impersonation: adminImpersonationRouter,
  discussions: adminDiscussionsRouter,
  contests: adminContestsRouter,
});
