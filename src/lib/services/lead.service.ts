import { prisma } from "@/lib/db";
import { optionalStringId, parseOptionalDateString } from "@/lib/parse-optional-date";
import type { CreateLeadInput, UpdateLeadInput, ListLeadsQuery } from "@/lib/validations/lead";
import type { LeadDisposition, PipelineStage, Prisma } from "@prisma/client";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function findDuplicateLeads(agencyId: string, data: { phone: string; email?: string; firstName: string; lastName: string; dateOfBirth?: string }) {
  const phoneNorm = normalizePhone(data.phone);
  const conditions: Prisma.LeadWhereInput[] = [];
  if (phoneNorm.length >= 10) {
    conditions.push({
      agencyId,
      phone: { contains: phoneNorm.slice(-4) },
    });
  }
  if (data.email) {
    conditions.push({ agencyId, email: data.email });
  }
  const dob = parseOptionalDateString(data.dateOfBirth);
  if (data.firstName && data.lastName && dob) {
    conditions.push({
      agencyId,
      firstName: { equals: data.firstName },
      lastName: { equals: data.lastName },
      dateOfBirth: dob,
    });
  }
  if (conditions.length === 0) return [];
  const existing = await prisma.lead.findFirst({
    where: { OR: conditions },
    orderBy: { createdAt: "desc" },
  });
  return existing ? [existing] : [];
}

export async function createLead(agencyId: string, input: CreateLeadInput, rawPayload?: unknown) {
  const duplicates = await findDuplicateLeads(agencyId, {
    phone: input.phone,
    email: input.email ?? undefined,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth,
  });
  const duplicateGroupId = duplicates[0]?.duplicateGroupId ?? `dg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (duplicates.length > 0 && !duplicates[0].duplicateGroupId) {
    await prisma.lead.update({
      where: { id: duplicates[0].id },
      data: { duplicateGroupId },
    });
  }
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");
  const dateOfBirth = parseOptionalDateString(input.dateOfBirth);
  const lead = await prisma.lead.create({
    data: {
      agencyId,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      phone: input.phone,
      email: input.email || null,
      source: input.source ?? null,
      vendor: input.vendor ?? null,
      campaign: input.campaign ?? null,
      subId: input.subId ?? null,
      dateOfBirth,
      gender: input.gender ?? null,
      address1: input.address1 ?? null,
      address2: input.address2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      county: input.county ?? null,
      smokerStatus: input.smokerStatus ?? null,
      coverageAmountInterest: input.coverageAmountInterest ?? null,
      beneficiaryName: input.beneficiaryName ?? null,
      preferredLanguage: input.preferredLanguage ?? null,
      bestCallTime: input.bestCallTime ?? null,
      leadCost: input.leadCost ?? null,
      leadScore: input.leadScore ?? null,
      consentStatus: input.consentStatus ?? null,
      doNotCall: input.doNotCall ?? false,
      assignedAgentId: optionalStringId(input.assignedAgentId),
      assignedManagerId: optionalStringId(input.assignedManagerId),
      disposition: (input.disposition as LeadDisposition) ?? "NEW",
      pipelineStage: (input.pipelineStage as PipelineStage) ?? "NEW_LEAD",
      notes: input.notes ?? null,
      ...(rawPayload != null && { rawPayload: rawPayload as Prisma.InputJsonValue }),
      duplicateGroupId,
    },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      assignedManager: { select: { id: true, name: true, email: true } },
    },
  });
  return { lead, isDuplicate: duplicates.length > 0 };
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  const fullName = input.firstName != null || input.lastName != null
    ? [input.firstName ?? "", input.lastName ?? ""].filter(Boolean).join(" ").trim() || undefined
    : undefined;
  return prisma.lead.update({
    where: { id },
    data: {
      ...(input.firstName != null && { firstName: input.firstName }),
      ...(input.lastName != null && { lastName: input.lastName }),
      ...(fullName != null && { fullName }),
      ...(input.phone != null && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.source !== undefined && { source: input.source ?? null }),
      ...(input.vendor !== undefined && { vendor: input.vendor ?? null }),
      ...(input.campaign !== undefined && { campaign: input.campaign ?? null }),
      ...(input.subId !== undefined && { subId: input.subId ?? null }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }),
      ...(input.gender !== undefined && { gender: input.gender ?? null }),
      ...(input.address1 !== undefined && { address1: input.address1 ?? null }),
      ...(input.address2 !== undefined && { address2: input.address2 ?? null }),
      ...(input.city !== undefined && { city: input.city ?? null }),
      ...(input.state !== undefined && { state: input.state ?? null }),
      ...(input.zip !== undefined && { zip: input.zip ?? null }),
      ...(input.county !== undefined && { county: input.county ?? null }),
      ...(input.smokerStatus !== undefined && { smokerStatus: input.smokerStatus ?? null }),
      ...(input.coverageAmountInterest !== undefined && { coverageAmountInterest: input.coverageAmountInterest ?? null }),
      ...(input.beneficiaryName !== undefined && { beneficiaryName: input.beneficiaryName ?? null }),
      ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage ?? null }),
      ...(input.bestCallTime !== undefined && { bestCallTime: input.bestCallTime ?? null }),
      ...(input.leadCost !== undefined && { leadCost: input.leadCost ?? null }),
      ...(input.leadScore !== undefined && { leadScore: input.leadScore ?? null }),
      ...(input.consentStatus !== undefined && { consentStatus: input.consentStatus ?? null }),
      ...(input.doNotCall !== undefined && { doNotCall: input.doNotCall }),
      ...(input.assignedAgentId !== undefined && { assignedAgentId: input.assignedAgentId ?? null }),
      ...(input.assignedManagerId !== undefined && { assignedManagerId: input.assignedManagerId ?? null }),
      ...(input.disposition !== undefined && { disposition: input.disposition as LeadDisposition }),
      ...(input.pipelineStage !== undefined && { pipelineStage: input.pipelineStage as PipelineStage }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.lastContactedAt !== undefined && { lastContactedAt: input.lastContactedAt ? new Date(input.lastContactedAt) : null }),
      ...(input.nextFollowUpAt !== undefined && { nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null }),
    },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      assignedManager: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      assignedManager: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      agency: { select: { id: true, name: true } },
      client: { select: { id: true } },
    },
  });
}

export async function listLeads(agencyId: string, query: ListLeadsQuery, scope: { agentId?: string; managerId?: string; role: string }) {
  const where: Prisma.LeadWhereInput = { agencyId };

  const scopeFilter: Prisma.LeadWhereInput[] = [];
  if (scope.role === "AGENT" && scope.agentId) {
    scopeFilter.push({
      OR: [
        { assignedAgentId: scope.agentId },
        { assignedManagerId: scope.agentId },
      ],
    });
  } else if (scope.role === "MANAGER" && scope.managerId) {
    where.assignedManagerId = scope.managerId;
  }
  if (query.disposition) where.disposition = query.disposition as LeadDisposition;
  if (query.pipelineStage) where.pipelineStage = query.pipelineStage as PipelineStage;
  if (query.assignedAgentId) where.assignedAgentId = query.assignedAgentId;
  if (query.assignedManagerId) where.assignedManagerId = query.assignedManagerId;
  if (query.source) where.source = query.source;
  if (query.state) where.state = query.state;
  if (query.fromDate || query.toDate) {
    where.createdAt = {};
    if (query.fromDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.fromDate);
    if (query.toDate) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.toDate);
  }
  if (query.search?.trim()) {
    const q = query.search.trim();
    scopeFilter.push({
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    });
  }
  if (scopeFilter.length > 0) {
    where.AND = scopeFilter;
  }
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        assignedAgent: { select: { id: true, name: true, email: true } },
        assignedManager: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}
