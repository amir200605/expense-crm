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

/**
 * Agency scope for team lists. SUPER_ADMIN often falls back to the oldest agency by `createdAt`,
 * which may have no users if another agency was seeded later — so we prefer the first agency
 * that actually has team members.
 */
export async function resolveAgencyIdForSessionWithUsers(user: SessionUser): Promise<string | null> {
  const id = await resolveAgencyIdForSession(user);
  if (!id) return null;

  const count = await prisma.user.count({ where: { agencyId: id } });
  if (count > 0) return id;

  if (user.role === "SUPER_ADMIN") {
    const withUsers = await prisma.agency.findFirst({
      where: { users: { some: {} } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (withUsers?.id) return withUsers.id;
  }

  return id;
}
