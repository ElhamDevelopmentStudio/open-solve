import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/permissions";
import { StaffAppShell } from "@/components/staff/shell/staff-app-shell";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    redirect("/sign-in");
  }

  return <StaffAppShell user={session.user}>{children}</StaffAppShell>;
}
