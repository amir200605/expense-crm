import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { buildAgentCardPngBuffer } from "@/lib/agent-card-image";
import { resolveAgencyIdForSessionWithUsers } from "@/lib/session-agency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = await resolveAgencyIdForSessionWithUsers(user);
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  const [agency, dbUser] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: agencyId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        npnNumber: true,
        phone: true,
        avatarUrl: true,
      },
    }),
  ]);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const png = await buildAgentCardPngBuffer({
      agencyName: agency?.name ?? "Prime Insurance Agency",
      name: dbUser.name ?? "Team Member",
      username: dbUser.username,
      role: dbUser.role,
      npnNumber: dbUser.npnNumber,
      phone: dbUser.phone,
      avatarUrl: dbUser.avatarUrl,
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[card-preview] buildAgentCardPngBuffer failed:", err);
    return NextResponse.json(
      { error: "Failed to render card preview" },
      { status: 500 }
    );
  }
}
