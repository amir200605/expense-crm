import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessAutomations } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { runAutomationForTest } from "@/lib/services/automation-engine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.leadId === "string" ? body.leadId : undefined;
  const testEmail = typeof body.testEmail === "string" && body.testEmail.trim() ? body.testEmail.trim() : undefined;

  const context = {
    agencyId,
    userId: user.id!,
    leadId,
    testEmail,
  };

  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { agencyId: true } });
    if (!lead || lead.agencyId !== agencyId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  }

  try {
    const result = await runAutomationForTest(id, context);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test run failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
