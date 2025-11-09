import { getSession, requireSession } from "@/lib/auth/session";
import type { UserRole } from "@prisma/client";

const STAFF_ROLES: UserRole[] = ["PROBLEM_CURATOR", "MODERATOR", "ADMIN"];

export const isStaffRole = (role: UserRole) => STAFF_ROLES.includes(role);

export async function requireStaffSession() {
  const session = await requireSession();
  if (!isStaffRole(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function getOptionalSession() {
  return getSession();
}
