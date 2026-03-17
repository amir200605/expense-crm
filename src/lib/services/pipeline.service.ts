import { prisma } from "@/lib/db";
import type { PipelineStage, Prisma } from "@prisma/client";

const STAGES: PipelineStage[] = [
  "NEW_LEAD",
  "CONTACTING",
  "QUOTED",
  "APPOINTMENT_SET",
  "APPLICATION_STARTED",
  "UNDERWRITING",
  "APPROVED",
  "PLACED",
  "CHARGEBACK_RISK",
  "LOST",
];

export async function getPipelineLeads(agencyId: string, scope: { agentId?: string; managerId?: string; role: string }) {
  const where: Prisma.LeadWhereInput = { agencyId };
  if (scope.role === "AGENT" && scope.agentId) {
    where.OR = [
      { assignedAgentId: scope.agentId },
      { assignedManagerId: scope.agentId },
    ];
  } else if (scope.role === "MANAGER" && scope.managerId) {
    where.assignedManagerId = scope.managerId;
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      assignedAgent: { select: { id: true, name: true } },
    },
  });

  const byStage: Record<string, typeof leads> = {};
  for (const stage of STAGES) {
    byStage[stage] = leads.filter((l) => l.pipelineStage === stage);
  }
  return { stages: STAGES, byStage };
}
