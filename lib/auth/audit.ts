import { prisma } from "@/lib/prisma";
import type { AuthAuditAction, Prisma } from "@prisma/client";

export async function createAuditLog(data: {
  userId?: string;
  action: AuthAuditAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.JsonObject;
}): Promise<void> {
  await prisma.authAuditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadata: data.metadata,
    },
  });
}

export async function getUserAuditLogs(
  userId: string,
  limit = 50,
) {
  return prisma.authAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

