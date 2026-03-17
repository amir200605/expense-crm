import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessAutomations } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  trigger: z.enum([
    "LEAD_CREATED", "LEAD_ASSIGNED", "STATUS_CHANGED", "NO_CONTACT_DAYS",
    "APPOINTMENT_SET", "APPOINTMENT_MISSED", "POLICY_APPROVED",
    "BIRTHDAY_UPCOMING", "DRAFT_DATE_APPROACHING", "CHARGEBACK_RISK",
  ]).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(["CREATE_TASK", "SEND_SMS", "SEND_EMAIL", "ADD_TAG", "CHANGE_STAGE", "CHANGE_DISPOSITION", "ASSIGN_AGENT", "SET_NEXT_FOLLOW_UP", "ADD_NOTE", "NOTIFY_AGENT", "WAIT"]),
    config: z.record(z.unknown()).optional(),
  })).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const { id } = await params;
  const automation = await prisma.automation.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: { id: true, status: true, startedAt: true, completedAt: true, triggerEntityId: true },
      },
    },
  });

  if (!automation || automation.agencyId !== user.agencyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ automation });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const { id } = await params;
  const existing = await prisma.automation.findUnique({ where: { id } });
  if (!existing || existing.agencyId !== user.agencyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.trigger !== undefined) data.trigger = parsed.data.trigger;
  if (parsed.data.triggerConfig !== undefined) data.triggerConfig = parsed.data.triggerConfig;
  if (parsed.data.actions !== undefined) data.actions = parsed.data.actions;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

  const automation = await prisma.automation.update({ where: { id }, data });
  return NextResponse.json({ automation });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const { id } = await params;
  const existing = await prisma.automation.findUnique({ where: { id } });
  if (!existing || existing.agencyId !== user.agencyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.automation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
