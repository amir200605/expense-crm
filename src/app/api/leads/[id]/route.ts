import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewLead, canEditLead } from "@/lib/permissions";
import { getLeadById, updateLead, deleteLead } from "@/lib/services/lead.service";
import { updateLeadSchema } from "@/lib/validations/lead";
import { serializeLeadForClient } from "@/lib/utils";
import type { SessionUser } from "@/lib/permissions";
import { fireAutomationTrigger } from "@/lib/services/automation-engine";

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
  const serialized = serializeLeadForClient(lead as unknown as Record<string, unknown>);
  return NextResponse.json(serialized);
}

export async function PATCH(
  req: Request,
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
  if (!canEditLead(session, lead)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const oldDisposition = lead.disposition;
  const oldStage = lead.pipelineStage;
  const oldAgentId = lead.assignedAgentId;
  const updated = await updateLead(id, parsed.data);

  const user = session.user as SessionUser;
  const ctx = { agencyId: lead.agencyId, userId: user.id!, leadId: id };

  if (parsed.data.disposition && parsed.data.disposition !== oldDisposition) {
    fireAutomationTrigger("STATUS_CHANGED", { ...ctx, oldValue: oldDisposition, newValue: parsed.data.disposition }).catch(() => {});
  }
  if (parsed.data.pipelineStage && parsed.data.pipelineStage !== oldStage) {
    fireAutomationTrigger("STATUS_CHANGED", { ...ctx, oldValue: oldStage, newValue: parsed.data.pipelineStage }).catch(() => {});
  }
  if (parsed.data.assignedAgentId && parsed.data.assignedAgentId !== oldAgentId) {
    fireAutomationTrigger("LEAD_ASSIGNED", ctx).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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
  if (!canEditLead(session, lead)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteLead(id);
  return new NextResponse(null, { status: 204 });
}
