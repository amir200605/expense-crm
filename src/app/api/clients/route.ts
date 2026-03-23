import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { listClients } from "@/lib/services/client.service";
import { listClientsQuerySchema } from "@/lib/validations/client";
import type { SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSession } from "@/lib/session-agency";
import { runClientWelcomeSmsAfterCreate } from "@/lib/services/trigger-client-welcome-sms";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const agencyId = await resolveAgencyIdForSession(user);
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as SessionUser;
    const agencyId = await resolveAgencyIdForSession(user);
    if (!agencyId) {
      return NextResponse.json(
        {
          error: "No agency",
          hint: "Create an agency and user (e.g. npm run db:seed), then sign in again.",
        },
        { status: 403 }
      );
    }
    const { createClientSchema } = await import("@/lib/validations/client");
    const body = await req.json().catch(() => ({}));
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { createClient } = await import("@/lib/services/client.service");
    const client = await createClient(agencyId, parsed.data, parsed.data.linkedLeadId);

    await runClientWelcomeSmsAfterCreate({
      agencyId,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        carrier: client.carrier,
        premiumAmount: client.premiumAmount,
      },
      linkedLeadId: parsed.data.linkedLeadId,
      userId: user.id,
      userName: user.name ?? null,
      userEmail: user.email ?? null,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    console.error("POST /api/clients", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Failed to create client";
    return NextResponse.json(
      {
        error: message,
        hint:
          message.includes("DATABASE_URL") || message.includes("Can't reach database")
            ? "Set DATABASE_URL in .env / Replit Secrets and run: npx prisma migrate deploy"
            : undefined,
      },
      { status: 500 }
    );
  }
}
