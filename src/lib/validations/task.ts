import { z } from "zod";

const taskTypeEnum = z.enum(["CALL", "SMS", "EMAIL", "APPOINTMENT", "DOCUMENT_REQUEST", "FOLLOW_UP", "BIRTHDAY_CHECK_IN", "POLICY_REVIEW"]);
const taskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().optional(),
  dueDate: z.string().datetime(),
  assignedToId: z.string(),
  relatedLeadId: z.string().optional(),
  relatedClientId: z.string().optional(),
  type: taskTypeEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().optional(),
  dueDate: z.string().datetime().optional(),
  status: taskStatusEnum.optional(),
  completedAt: z.string().datetime().optional(),
});

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  assignedToId: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
