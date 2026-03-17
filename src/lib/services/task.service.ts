import { prisma } from "@/lib/db";
import type { TaskStatus, TaskType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: number;
  dueDate: Date;
  assignedToId: string;
  relatedLeadId?: string;
  relatedClientId?: string;
  type?: TaskType;
}) {
  return prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 0,
      dueDate: data.dueDate,
      assignedToId: data.assignedToId,
      relatedLeadId: data.relatedLeadId ?? null,
      relatedClientId: data.relatedClientId ?? null,
      type: (data.type as TaskType) ?? "FOLLOW_UP",
    },
  });
}

export async function updateTask(id: string, data: { title?: string; description?: string; priority?: number; dueDate?: Date; status?: TaskStatus; completedAt?: Date }) {
  return prisma.task.update({
    where: { id },
    data: {
      ...(data.title != null && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate != null && { dueDate: data.dueDate }),
      ...(data.status != null && { status: data.status as TaskStatus }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt, status: "COMPLETED" as TaskStatus }),
    },
  });
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: { lead: true, client: true, assignedTo: { select: { id: true, name: true } } },
  });
}

export async function listTasks(params: {
  agencyId?: string;
  assignedToId?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}) {
  const where: Prisma.TaskWhereInput = {};
  if (params.assignedToId) where.assignedToId = params.assignedToId;
  if (params.status) where.status = params.status as TaskStatus;
  if (params.from || params.to) {
    where.dueDate = {};
    if (params.from) (where.dueDate as Prisma.DateTimeFilter).gte = new Date(params.from);
    if (params.to) (where.dueDate as Prisma.DateTimeFilter).lte = new Date(params.to);
  }
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { assignedTo: { select: { id: true, name: true } }, lead: { select: { id: true, fullName: true } }, client: { select: { id: true } } },
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total, page: params.page, limit: params.limit };
}
