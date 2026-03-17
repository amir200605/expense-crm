import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canEditLead } from "@/lib/permissions";
import { getLeadById } from "@/lib/services/lead.service";
import { createClient } from "@/lib/services/client.service";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: leadId } = await params;
  const lead = await getLeadById(leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!canEditLead(session, lead)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (lead.client) {
    return NextResponse.json({ client: lead.client }, { status: 200 });
  }
  const client = await createClient(lead.agencyId, {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email ?? undefined,
    phone: lead.phone,
    dateOfBirth: lead.dateOfBirth?.toISOString().slice(0, 10),
    address1: lead.address1 ?? undefined,
    address2: lead.address2 ?? undefined,
    city: lead.city ?? undefined,
    state: lead.state ?? undefined,
    zip: lead.zip ?? undefined,
    beneficiaryName: lead.beneficiaryName ?? undefined,
    notes: lead.notes ?? undefined,
    linkedLeadId: leadId,
  }, leadId);
  await prisma.lead.update({
    where: { id: leadId },
    data: { disposition: "SOLD", pipelineStage: "PLACED" },
  });
  return NextResponse.json({ client }, { status: 201 });
}
