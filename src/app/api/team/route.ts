import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessTeam } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSessionWithUsers } from "@/lib/session-agency";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessTeam(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as SessionUser;
  const agencyId = await resolveAgencyIdForSessionWithUsers(user);
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  try {
    const members = await prisma.user.findMany({
      where: { agencyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        username: true,
        avatarUrl: true,
        cardImageUrl: true,
        phone: true,
        npnNumber: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ members });
  } catch (e) {
    console.error("GET /api/team", e);
    const members = await prisma.user.findMany({
      where: { agencyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        username: true,
        avatarUrl: true,
        phone: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      members: members.map((m) => ({ ...m, npnNumber: null, cardImageUrl: null })),
      _meta: {
        warning:
          "Some columns missing in DB. Run: npx prisma migrate deploy (adds npnNumber / cardImageUrl on User).",
      },
    });
  }
}
