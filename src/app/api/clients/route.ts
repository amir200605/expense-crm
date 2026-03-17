import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClients } from "@/lib/services/client.service";
import { listClientsQuerySchema } from "@/lib/validations/client";
import type { SessionUser } from "@/lib/permissions";

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
  return NextResponse.json(client, { status: 201 });
}
