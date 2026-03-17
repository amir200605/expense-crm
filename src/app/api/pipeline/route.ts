import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPipelineLeads } from "@/lib/services/pipeline.service";
import type { SessionUser } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });
  const scope = {
    agentId: user.role === "AGENT" ? user.id : undefined,
    managerId: user.role === "MANAGER" ? user.id : undefined,
    role: user.role ?? "AGENT",
  };
  const result = await getPipelineLeads(agencyId, scope);
  return NextResponse.json(result);
}
