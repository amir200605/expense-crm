import { prisma } from "@/lib/db";

export async function getLeadStats(agencyId: string) {
  const [total, byDisposition, byStage, recentLeads, thisWeek] = await Promise.all([
    prisma.lead.count({ where: { agencyId } }),
    prisma.lead.groupBy({ by: ["disposition"], where: { agencyId }, _count: true }),
    prisma.lead.groupBy({ by: ["pipelineStage"], where: { agencyId }, _count: true }),
    prisma.lead.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, disposition: true, pipelineStage: true, createdAt: true, source: true },
    }),
    prisma.lead.count({
      where: {
        agencyId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
  ]);

  return {
    total,
    thisWeek,
    byDisposition: byDisposition.map((d) => ({ disposition: d.disposition, count: d._count })),
    byStage: byStage.map((s) => ({ stage: s.pipelineStage, count: s._count })),
    recentLeads,
  };
}

export async function getCommissionStats(agencyId: string) {
  const commissions = await prisma.commission.findMany({
    where: { client: { agencyId } },
    select: { amount: true, status: true, expectedDate: true, receivedDate: true },
  });

  const totalExpected = commissions
    .filter((c) => c.status === "EXPECTED" || c.status === "PENDING")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalReceived = commissions
    .filter((c) => c.status === "RECEIVED")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalChargeback = commissions
    .filter((c) => c.status === "CHARGEBACK")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalAll = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

  return {
    totalCommissions: commissions.length,
    totalExpected,
    totalReceived,
    totalChargeback,
    totalAll,
    byStatus: {
      pending: commissions.filter((c) => c.status === "PENDING").length,
      expected: commissions.filter((c) => c.status === "EXPECTED").length,
      received: commissions.filter((c) => c.status === "RECEIVED").length,
      chargeback: commissions.filter((c) => c.status === "CHARGEBACK").length,
    },
  };
}

export async function getPolicyStats(agencyId: string) {
  const policies = await prisma.policy.findMany({
    where: { client: { agencyId } },
    select: { policyStatus: true, faceAmount: true, premium: true },
  });

  const totalPolicies = policies.length;
  const placed = policies.filter((p) => p.policyStatus === "PLACED");
  const totalFaceAmount = placed.reduce((sum, p) => sum + Number(p.faceAmount ?? 0), 0);
  const totalPremium = placed.reduce((sum, p) => sum + Number(p.premium ?? 0), 0);
  const byStatus = policies.reduce<Record<string, number>>((acc, p) => {
    acc[p.policyStatus] = (acc[p.policyStatus] ?? 0) + 1;
    return acc;
  }, {});

  return { totalPolicies, placedCount: placed.length, totalFaceAmount, totalPremium, byStatus };
}

export async function getClientStats(agencyId: string) {
  const [total, recentClients] = await Promise.all([
    prisma.client.count({ where: { agencyId } }),
    prisma.client.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, carrier: true, createdAt: true },
    }),
  ]);

  return { total, recentClients };
}

export async function getAgentPerformance(agencyId: string) {
  const agents = await prisma.user.findMany({
    where: { agencyId, role: "AGENT" },
    select: {
      id: true,
      name: true,
      _count: { select: { leadsAssignedAsAgent: true, commissions: true } },
    },
  });

  return agents.map((a) => ({
    name: a.name,
    leadsAssigned: a._count.leadsAssignedAsAgent,
    commissions: a._count.commissions,
  }));
}

export async function getChargebackStats(agencyId: string) {
  const chargebacks = await prisma.chargeback.findMany({
    where: { policy: { client: { agencyId } } },
    select: { amount: true, recovered: true, reason: true, date: true },
  });

  const totalAmount = chargebacks.reduce((sum, c) => sum + Number(c.amount), 0);
  const recoveredAmount = chargebacks.filter((c) => c.recovered).reduce((sum, c) => sum + Number(c.amount), 0);

  return {
    totalChargebacks: chargebacks.length,
    totalAmount,
    recoveredAmount,
    unrecoveredAmount: totalAmount - recoveredAmount,
    recoveredCount: chargebacks.filter((c) => c.recovered).length,
  };
}

export async function getTaskStats(agencyId: string) {
  const tasks = await prisma.task.findMany({
    where: { assignedTo: { agencyId } },
    select: { status: true, type: true, dueDate: true },
  });

  const overdue = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && new Date(t.dueDate) < new Date());

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    overdue: overdue.length,
    byType: tasks.reduce<Record<string, number>>((acc, t) => {
      acc[t.type] = (acc[t.type] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

export async function getAppointmentStats(agencyId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { agent: { agencyId } },
    select: { status: true, type: true, date: true },
  });

  const upcoming = appointments.filter((a) => a.status === "SCHEDULED" && new Date(a.date) >= new Date());

  return {
    total: appointments.length,
    upcoming: upcoming.length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
    noShow: appointments.filter((a) => a.status === "NO_SHOW").length,
    byType: appointments.reduce<Record<string, number>>((acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

export async function getTeamOverview(agencyId: string) {
  const members = await prisma.user.findMany({
    where: { agencyId },
    select: { id: true, name: true, email: true, role: true, username: true },
  });

  const byRole = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return { totalMembers: members.length, byRole, members: members.map((m) => ({ name: m.name, role: m.role })) };
}

export const crmToolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "get_lead_stats",
      description: "Get lead statistics: total count, leads this week, breakdown by disposition and pipeline stage, and 5 most recent leads.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_commission_stats",
      description: "Get commission statistics: total expected, received, chargeback amounts, and count by status.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_policy_stats",
      description: "Get policy statistics: total policies, placed count, total face amount, total premium, breakdown by status.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_client_stats",
      description: "Get client statistics: total clients and 5 most recent clients.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_agent_performance",
      description: "Get agent performance: number of leads assigned and commissions per agent.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_chargeback_stats",
      description: "Get chargeback statistics: total chargebacks, amounts, recovered vs unrecovered.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_task_stats",
      description: "Get task statistics: total, pending, completed, overdue, and breakdown by type.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_appointment_stats",
      description: "Get appointment statistics: total, upcoming, completed, no-shows, and breakdown by type.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_team_overview",
      description: "Get team overview: total members, breakdown by role, and list of all team members.",
    },
  },
];

export async function executeCrmTool(name: string, agencyId: string): Promise<string> {
  switch (name) {
    case "get_lead_stats":
      return JSON.stringify(await getLeadStats(agencyId));
    case "get_commission_stats":
      return JSON.stringify(await getCommissionStats(agencyId));
    case "get_policy_stats":
      return JSON.stringify(await getPolicyStats(agencyId));
    case "get_client_stats":
      return JSON.stringify(await getClientStats(agencyId));
    case "get_agent_performance":
      return JSON.stringify(await getAgentPerformance(agencyId));
    case "get_chargeback_stats":
      return JSON.stringify(await getChargebackStats(agencyId));
    case "get_task_stats":
      return JSON.stringify(await getTaskStats(agencyId));
    case "get_appointment_stats":
      return JSON.stringify(await getAppointmentStats(agencyId));
    case "get_team_overview":
      return JSON.stringify(await getTeamOverview(agencyId));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}
