import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

const LIMIT = 10;

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
    return NextResponse.json({ leads: [] });
  }

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const where: {
    agencyId: string;
    nextFollowUpAt: { lte: Date; not: null };
    OR?: { assignedAgentId: string }[] | { assignedManagerId: string }[];
  } = {
    agencyId,
    nextFollowUpAt: { lte: endOfToday, not: null },
  };

  if (agentId) {
    where.OR = [
      { assignedAgentId: agentId },
      { assignedManagerId: agentId },
    ];
  } else if (managerId) {
    where.OR = [{ assignedManagerId: managerId }];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { nextFollowUpAt: "asc" },
    take: LIMIT,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      disposition: true,
      pipelineStage: true,
      nextFollowUpAt: true,
      assignedAgent: { select: { name: true } },
    },
  });

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      fullName: l.fullName ?? `${l.firstName} ${l.lastName}`,
      disposition: l.disposition,
      pipelineStage: l.pipelineStage,
      nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
      assignedAgentName: l.assignedAgent?.name ?? null,
    })),
  });
}
