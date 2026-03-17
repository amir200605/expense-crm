import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewClient, canEditClient } from "@/lib/permissions";
import { getClientById, updateClient } from "@/lib/services/client.service";
import { updateClientSchema } from "@/lib/validations/client";
import type { SessionUser } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!canViewClient(session, client)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(client);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!canEditClient(session, client)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateClient(id, parsed.data);
  return NextResponse.json(updated);
}
