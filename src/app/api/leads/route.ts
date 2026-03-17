import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewLead } from "@/lib/permissions";
import { listLeads } from "@/lib/services/lead.service";
import { listLeadsQuerySchema } from "@/lib/validations/lead";
import type { SessionUser } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
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
}
