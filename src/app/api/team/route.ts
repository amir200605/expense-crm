import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessTeam } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessTeam(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    where: { agencyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      username: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ members });
}
