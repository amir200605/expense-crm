import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessAutomations } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum([
    "LEAD_CREATED", "LEAD_ASSIGNED", "STATUS_CHANGED", "NO_CONTACT_DAYS",
    "APPOINTMENT_SET", "APPOINTMENT_MISSED", "POLICY_APPROVED",
    "BIRTHDAY_UPCOMING", "DRAFT_DATE_APPROACHING", "CHARGEBACK_RISK",
  ]),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(["CREATE_TASK", "SEND_SMS", "SEND_EMAIL", "ADD_TAG", "CHANGE_STAGE", "CHANGE_DISPOSITION", "ASSIGN_AGENT", "SET_NEXT_FOLLOW_UP", "ADD_NOTE", "NOTIFY_AGENT", "WAIT"]),
    config: z.record(z.unknown()).optional(),
  })).min(1),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const automations = await prisma.automation.findMany({
    where: { agencyId: user.agencyId! },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { runs: true } } },
  });

  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAutomations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as SessionUser;
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const automation = await prisma.automation.create({
    data: {
      agencyId: user.agencyId!,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      triggerConfig: parsed.data.triggerConfig ?? {},
      actions: parsed.data.actions as object[],
      enabled: parsed.data.enabled ?? false,
    },
  });

  return NextResponse.json({ automation }, { status: 201 });
}
