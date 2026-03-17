import { z } from "zod";

const leadDispositionEnum = z.enum([
  "NEW", "ATTEMPTING_CONTACT", "CONTACTED", "INTERESTED", "APPOINTMENT_SET",
  "PRESENTED", "APPLICATION_SENT", "SOLD", "NOT_INTERESTED", "BAD_LEAD",
  "DNC", "RECYCLE", "FOLLOW_UP_LATER",
]);

const pipelineStageEnum = z.enum([
  "NEW_LEAD", "CONTACTING", "QUOTED", "APPOINTMENT_SET", "APPLICATION_STARTED",
  "UNDERWRITING", "APPROVED", "PLACED", "CHARGEBACK_RISK", "LOST",
]);

export const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().optional(),
  vendor: z.string().optional(),
  campaign: z.string().optional(),
  subId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
  smokerStatus: z.string().optional(),
  coverageAmountInterest: z.number().optional(),
  beneficiaryName: z.string().optional(),
  preferredLanguage: z.string().optional(),
  bestCallTime: z.string().optional(),
  leadCost: z.number().optional(),
  leadScore: z.number().optional(),
  consentStatus: z.string().optional(),
  doNotCall: z.boolean().optional(),
  assignedAgentId: z.string().optional(),
  assignedManagerId: z.string().optional(),
  disposition: leadDispositionEnum.optional(),
  pipelineStage: pipelineStageEnum.optional(),
  notes: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  fullName: z.string().optional(),
  lastContactedAt: z.string().datetime().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  disposition: leadDispositionEnum.optional(),
  pipelineStage: pipelineStageEnum.optional(),
  assignedAgentId: z.string().optional(),
  assignedManagerId: z.string().optional(),
  source: z.string().optional(),
  state: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
