import { prisma } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
}) {
  return prisma.activityLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      ...(params.oldValue != null && { oldValue: params.oldValue as object }),
      ...(params.newValue != null && { newValue: params.newValue as object }),
      ip: params.ip ?? null,
    },
  });
}
