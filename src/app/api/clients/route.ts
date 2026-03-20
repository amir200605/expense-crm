import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClients } from "@/lib/services/client.service";
import { sendClientWelcomeSms } from "@/lib/services/client-welcome-sms";
import { listClientsQuerySchema } from "@/lib/validations/client";
import type { SessionUser } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const parsed = listClientsQuerySchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    search: searchParams.get("search"),
  });
  const query = parsed.success ? parsed.data : listClientsQuerySchema.parse({});
  const result = await listClients(agencyId, query);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });
  const { createClientSchema } = await import("@/lib/validations/client");
  const body = await req.json().catch(() => ({}));
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { createClient } = await import("@/lib/services/client.service");
  const client = await createClient(agencyId, parsed.data, parsed.data.linkedLeadId);

  // Auto-send welcome SMS when a client is added (if Telnyx is configured).
  try {
    const latestPolicy = await prisma.policy.findFirst({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        carrier: true,
        policyNumber: true,
        faceAmount: true,
        premium: true,
        paymentDraftDate: true,
      },
    });
    await sendClientWelcomeSms({
      agencyId,
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        carrier: client.carrier,
        premiumAmount: client.premiumAmount,
      },
      policy: latestPolicy,
      agentName: user.name ?? user.email ?? "your life insurance agent",
    });
  } catch (smsError) {
    console.error("[clients] welcome SMS send failed:", smsError);
  }

  return NextResponse.json(client, { status: 201 });
}
