import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listAppointmentsQuerySchema } from "@/lib/validations/appointment";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import type { SessionUser } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { searchParams } = new URL(req.url);
  const requestedAgent = searchParams.get("agentId") || user.id;
  // Agents can only see their own appointments
  const effectiveAgent = user.role === "AGENT" ? user.id! : requestedAgent;

  const parsed = listAppointmentsQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    agentId: effectiveAgent,
    leadId: searchParams.get("leadId"),
    clientId: searchParams.get("clientId"),
  });
  const query = parsed.success ? parsed.data : {};
  const where: { agentId?: string; leadId?: string; clientId?: string; date?: { gte?: Date; lte?: Date } } = {
    agentId: query?.agentId || user.id!,
  };
  if (query?.from) where.date = { ...where.date, gte: new Date(query.from) };
  if (query?.to) where.date = { ...where.date, lte: new Date(query.to) };
  if (query?.leadId) where.leadId = query.leadId;
  if (query?.clientId) where.clientId = query.clientId;
  const items = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { lead: { select: { id: true, fullName: true } }, client: { select: { id: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const body = await req.json().catch(() => ({}));
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const appointment = await prisma.appointment.create({
    data: {
      leadId: parsed.data.leadId ?? null,
      clientId: parsed.data.clientId ?? null,
      agentId: parsed.data.agentId || user.id!,
      date: new Date(parsed.data.date),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      timezone: parsed.data.timezone ?? null,
      type: (parsed.data.type as "IN_PERSON" | "PHONE" | "VIDEO" | "CALLBACK") ?? "PHONE",
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  return NextResponse.json(appointment, { status: 201 });
}
