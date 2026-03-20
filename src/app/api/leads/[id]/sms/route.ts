import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewLead } from "@/lib/permissions";
import { getLeadById } from "@/lib/services/lead.service";
import { prisma } from "@/lib/db";

type SmsNewValue = {
  to?: string;
  message?: string;
  sendTo?: string;
  sent?: boolean;
  source?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!canViewLead(session, lead)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.activityLog.findMany({
    where: {
      entityType: "Lead",
      entityId: id,
      action: "SMS_SENT",
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const messages = rows.map((row) => {
    const nv = (row.newValue ?? {}) as SmsNewValue;
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      to: nv.to ?? null,
      message: typeof nv.message === "string" ? nv.message : null,
      sendTo: nv.sendTo ?? null,
      sent: nv.sent !== false,
      source: nv.source ?? (nv.message ? "automation" : "unknown"),
      sentByName: row.user?.name ?? row.user?.email ?? null,
    };
  });

  return NextResponse.json({ messages });
}
