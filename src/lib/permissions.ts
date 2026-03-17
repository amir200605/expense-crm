import type { Session } from "next-auth";
import type { Role, Lead, Client, User } from "@prisma/client";

export type SessionUser = Session["user"] & {
  id?: string;
  role?: Role;
  agencyId?: string | null;
};

export function isSuperAdmin(session: Session | null): boolean {
  const user = session?.user as SessionUser | undefined;
  return user?.role === "SUPER_ADMIN";
}

export function canManageAgency(session: Session | null, agencyId: string): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return user.agencyId === agencyId && (user.role === "AGENCY_OWNER" || user.role === "MANAGER");
}

export function canViewLead(session: Session | null, lead: { agencyId: string; assignedAgentId: string | null; assignedManagerId: string | null }): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (lead.agencyId !== user.agencyId) return false;
  if (user.role === "AGENCY_OWNER" || user.role === "MANAGER" || user.role === "QA_COMPLIANCE") return true;
  if (user.role === "AGENT") return lead.assignedAgentId === user.id || lead.assignedManagerId === user.id;
  return false;
}

export function canEditLead(session: Session | null, lead: { agencyId: string; assignedAgentId: string | null; assignedManagerId: string | null }): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (lead.agencyId !== user.agencyId) return false;
  if (user.role === "QA_COMPLIANCE") return false; // read-only
  if (user.role === "AGENCY_OWNER" || user.role === "MANAGER") return true;
  if (user.role === "AGENT") return lead.assignedAgentId === user.id || lead.assignedManagerId === user.id;
  return false;
}

export function canViewClient(session: Session | null, client: { agencyId: string }): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return client.agencyId === user.agencyId;
}

export function canEditClient(session: Session | null, client: { agencyId: string }): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "QA_COMPLIANCE") return false;
  return client.agencyId === user.agencyId;
}

export function canAccessAdmin(session: Session | null): boolean {
  return isSuperAdmin(session);
}

export function canAccessReports(session: Session | null): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user) return false;
  return ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER", "QA_COMPLIANCE"].includes(user.role ?? "");
}

export function canAccessTeam(session: Session | null): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user) return false;
  return ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"].includes(user.role ?? "");
}

export function canAccessCommissions(session: Session | null): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user) return false;
  return ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"].includes(user.role ?? "");
}

export function canAccessAutomations(session: Session | null): boolean {
  const user = session?.user as SessionUser | undefined;
  if (!user) return false;
  return ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER"].includes(user.role ?? "");
}
