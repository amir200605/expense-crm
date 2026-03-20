import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { canViewLead } from "@/lib/permissions";
import { listLeads } from "@/lib/services/lead.service";
import { listLeadsQuerySchema } from "@/lib/validations/lead";
import type { SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSession } from "@/lib/session-agency";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = await resolveAgencyIdForSession(user);
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const parsed = listLeadsQuerySchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    search: searchParams.get("search"),
    disposition: searchParams.get("disposition"),
    pipelineStage: searchParams.get("pipelineStage"),
    assignedAgentId: searchParams.get("assignedAgentId"),
    assignedManagerId: searchParams.get("assignedManagerId"),
    source: searchParams.get("source"),
    state: searchParams.get("state"),
    fromDate: searchParams.get("fromDate"),
    toDate: searchParams.get("toDate"),
  });
  const query = parsed.success ? parsed.data : listLeadsQuerySchema.parse({});
  const scope = {
    agentId: user.role === "AGENT" ? user.id : undefined,
    managerId: user.role === "MANAGER" ? user.id : undefined,
    role: user.role ?? "AGENT",
  };
  const result = await listLeads(agencyId, query, scope);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as SessionUser;
    const agencyId = await resolveAgencyIdForSession(user);
    if (!agencyId) {
      return NextResponse.json({ error: "No agency" }, { status: 403 });
    }
    const { createLeadSchema } = await import("@/lib/validations/lead");
    const body = await req.json().catch(() => ({}));
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { createLead } = await import("@/lib/services/lead.service");
    const { lead, isDuplicate } = await createLead(agencyId, parsed.data, body);

    // Fire automation triggers (non-blocking)
    import("@/lib/services/automation-engine").then(({ fireAutomationTrigger }) => {
      const ctx = { agencyId, userId: user.id!, leadId: lead.id };
      fireAutomationTrigger("LEAD_CREATED", ctx).catch(() => {});
      if (lead.assignedAgentId) {
        fireAutomationTrigger("LEAD_ASSIGNED", ctx).catch(() => {});
      }
    }).catch(() => {});

    return NextResponse.json({ lead, isDuplicate }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid assignment: agent or manager not found for this agency." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Failed to create lead";
    return NextResponse.json(
      {
        error: message,
        hint:
          process.env.NODE_ENV !== "production"
            ? "Check server logs for the full stack trace."
            : undefined,
      },
      { status: 500 }
    );
  }
}
