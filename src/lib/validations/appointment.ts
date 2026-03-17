import { z } from "zod";

const appointmentTypeEnum = z.enum(["IN_PERSON", "PHONE", "VIDEO", "CALLBACK"]);
const appointmentStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]);

export const createAppointmentSchema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  agentId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().optional(),
  type: appointmentTypeEnum.optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: appointmentStatusEnum.optional(),
  reminderSent: z.boolean().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  agentId: z.string().optional(),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
});
