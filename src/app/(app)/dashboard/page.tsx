import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const role = user?.role ?? "AGENT";

  if (role === "SUPER_ADMIN" || role === "AGENCY_OWNER") {
    return <OwnerDashboard agencyId={user?.agencyId ?? ""} />;
  }
  if (role === "MANAGER") {
    return <ManagerDashboard agencyId={user?.agencyId ?? ""} managerId={user?.id ?? ""} />;
  }
  return <AgentDashboard agencyId={user?.agencyId ?? ""} agentId={user?.id ?? ""} />;
}
