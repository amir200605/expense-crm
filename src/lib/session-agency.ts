import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

/**
 * Returns the agency scope for API routes. SUPER_ADMIN may have no agencyId in JWT;
 * we fall back to the first agency so core CRM actions (leads, team) still work.
 */
export async function resolveAgencyIdForSession(user: SessionUser): Promise<string | null> {
  if (user.agencyId) return user.agencyId;
  if (user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { agencyId: true },
    });
    if (dbUser?.agencyId) return dbUser.agencyId;
  }
  if (user.role === "SUPER_ADMIN") {
    const a = await prisma.agency.findFirst({ orderBy: { createdAt: "asc" } });
    return a?.id ?? null;
  }
  return null;
}
