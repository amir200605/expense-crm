import { prisma } from "@/lib/db";
import type { CreateClientInput, UpdateClientInput, ListClientsQuery } from "@/lib/validations/client";
import type { Prisma } from "@prisma/client";

export async function createClient(agencyId: string, input: CreateClientInput, linkedLeadId?: string) {
  return prisma.client.create({
    data: {
      agencyId,
      linkedLeadId: linkedLeadId ?? input.linkedLeadId ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || null,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      address1: input.address1 ?? null,
      address2: input.address2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      beneficiaryName: input.beneficiaryName ?? null,
      beneficiaryRelation: input.beneficiaryRelation ?? null,
      existingCoverage: input.existingCoverage ?? null,
      replacementWarning: input.replacementWarning ?? false,
      notes: input.notes ?? null,
      householdNotes: input.householdNotes ?? null,
    },
  });
}

export async function deleteClient(id: string) {
  return prisma.client.delete({ where: { id } });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  return prisma.client.update({
    where: { id },
    data: {
      ...(input.firstName != null && { firstName: input.firstName }),
      ...(input.lastName != null && { lastName: input.lastName }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.phone != null && { phone: input.phone }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }),
      ...(input.address1 !== undefined && { address1: input.address1 ?? null }),
      ...(input.address2 !== undefined && { address2: input.address2 ?? null }),
      ...(input.city !== undefined && { city: input.city ?? null }),
      ...(input.state !== undefined && { state: input.state ?? null }),
      ...(input.zip !== undefined && { zip: input.zip ?? null }),
      ...(input.beneficiaryName !== undefined && { beneficiaryName: input.beneficiaryName ?? null }),
      ...(input.beneficiaryRelation !== undefined && { beneficiaryRelation: input.beneficiaryRelation ?? null }),
      ...(input.existingCoverage !== undefined && { existingCoverage: input.existingCoverage ?? null }),
      ...(input.replacementWarning !== undefined && { replacementWarning: input.replacementWarning }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.householdNotes !== undefined && { householdNotes: input.householdNotes ?? null }),
    },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      lead: true,
      policies: true,
      agency: { select: { id: true, name: true } },
    },
  });
}

export async function listClients(agencyId: string, query: ListClientsQuery) {
  const where: Prisma.ClientWhereInput = { agencyId };
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.client.count({ where }),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}
