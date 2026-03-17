import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const { searchParams } = new URL(req.url);
  const agencyId = searchParams.get("agencyId") ?? user.agencyId;
  const managerId = searchParams.get("managerId");
  const agentId = searchParams.get("agentId");

  if (!agencyId) {
    return NextResponse.json({ stats: {} });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  if (agentId) {
    const [myLeads, tasksToday, followUpsDue, appointmentsToday] = await Promise.all([
      prisma.lead.count({
        where: {
          agencyId,
          OR: [{ assignedAgentId: agentId }, { assignedManagerId: agentId }],
        },
      }),
      prisma.task.count({
        where: {
          assignedToId: agentId,
          status: { not: "COMPLETED" },
          dueDate: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.lead.count({
        where: {
          agencyId,
          OR: [{ assignedAgentId: agentId }, { assignedManagerId: agentId }],
          nextFollowUpAt: { lte: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000), not: null },
        },
      }),
      prisma.appointment.count({
        where: {
          agentId,
          date: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) },
          status: "SCHEDULED",
        },
      }),
    ]);
    return NextResponse.json({
      stats: { myLeads, tasksToday, followUpsDue, appointmentsToday },
    });
  }

  if (managerId) {
    const [totalLeads, activeAgents, appointmentsSet, followUpsDue] = await Promise.all([
      prisma.lead.count({ where: { agencyId, assignedManagerId: managerId } }),
      prisma.user.count({ where: { agencyId, role: "AGENT" } }),
      prisma.appointment.count({
        where: {
          agent: { agencyId },
          date: { gte: startOfWeek },
          status: "SCHEDULED",
        },
      }),
      prisma.lead.count({
        where: {
          agencyId,
          assignedManagerId: managerId,
          nextFollowUpAt: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), not: null },
        },
      }),
    ]);
    return NextResponse.json({
      stats: { totalLeads, activeAgents, appointmentsSet, followUpsDue },
    });
  }

  const [
    totalLeads,
    leadsThisWeek,
    appointmentsSet,
    policiesPlaced,
    expectedCommission,
    chargebacks,
  ] = await Promise.all([
    prisma.lead.count({ where: { agencyId } }),
    prisma.lead.count({
      where: { agencyId, createdAt: { gte: startOfWeek } },
    }),
    prisma.appointment.count({
      where: { agent: { agencyId }, date: { gte: startOfWeek }, status: "SCHEDULED" },
    }),
    prisma.policy.count({
      where: { client: { agencyId }, policyStatus: "PLACED" },
    }),
    prisma.commission.aggregate({
      where: { client: { agencyId }, status: "EXPECTED" },
      _sum: { amount: true },
    }),
    prisma.chargeback.aggregate({
      where: { policy: { client: { agencyId } } },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalLeads,
      leadsThisWeek,
      appointmentsSet,
      policiesPlaced,
      expectedCommission: Number(expectedCommission._sum.amount ?? 0),
      chargebacks: Number(chargebacks._sum.amount ?? 0),
    },
  });
}
