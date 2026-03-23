import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canEditLead } from "@/lib/permissions";
import { getLeadById } from "@/lib/services/lead.service";
import { createClient } from "@/lib/services/client.service";
import { runClientWelcomeSmsAfterCreate } from "@/lib/services/trigger-client-welcome-sms";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  try {
    const appBaseUrl = new URL(req.url).origin;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const lead = await getLeadById(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!canEditLead(session, lead)) {
      return NextResponse.json(
        { error: "You are not allowed to convert this lead. Assign the lead to your user or use a manager/owner account." },
        { status: 403 }
      );
    }
    const user = session.user as SessionUser;
    if (lead.client) {
      const existingClient = await prisma.client.findUnique({
        where: { id: lead.client.id },
        select: {
          id: true,
          agencyId: true,
          firstName: true,
          lastName: true,
          phone: true,
          carrier: true,
          premiumAmount: true,
        },
      });
      let welcomeSms = null as Awaited<ReturnType<typeof runClientWelcomeSmsAfterCreate>> | null;
      if (existingClient) {
        welcomeSms = await runClientWelcomeSmsAfterCreate({
          agencyId: existingClient.agencyId,
          appBaseUrl,
          client: {
            id: existingClient.id,
            firstName: existingClient.firstName,
            lastName: existingClient.lastName,
            phone: existingClient.phone,
            carrier: existingClient.carrier,
            premiumAmount: existingClient.premiumAmount,
          },
          linkedLeadId: leadId,
          userId: user.id,
          userName: user.name ?? null,
          userEmail: user.email ?? null,
        });
      }
      return NextResponse.json({ client: lead.client, resentWelcome: true, welcomeSms }, { status: 200 });
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

    const welcomeSms = await runClientWelcomeSmsAfterCreate({
      agencyId: lead.agencyId,
      appBaseUrl,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        carrier: client.carrier,
        premiumAmount: client.premiumAmount,
      },
      linkedLeadId: leadId,
      userId: user.id,
      userName: user.name ?? null,
      userEmail: user.email ?? null,
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { disposition: "SOLD", pipelineStage: "PLACED" },
    });
    return NextResponse.json({ client, welcomeSms }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads/[id]/convert", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const existingClient = await prisma.client.findUnique({
          where: { linkedLeadId: leadId },
          select: { id: true },
        });
        if (existingClient) {
          return NextResponse.json({ client: existingClient }, { status: 200 });
        }
      }
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Convert to client failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
