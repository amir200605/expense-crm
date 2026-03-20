import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canAccessTeam, type SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSession } from "@/lib/session-agency";

const inviteSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8),
  role: z.enum(["AGENT", "MANAGER"]),
});

/**
 * Invite a team member into the **current user's agency**.
 * (Public POST /api/auth/signup uses findFirst() and can attach users to the wrong agency.)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessTeam(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inviter = session.user as SessionUser;
    const agencyId = await resolveAgencyIdForSession(inviter);
    if (!agencyId) {
      return NextResponse.json({ error: "No agency" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, username, password, role } = parsed.data;
    const normalized = username.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { username: normalized },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already taken." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        username: normalized,
        email: `${normalized}@placeholder.local`,
        password: hashed,
        agencyId,
        role,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invite failed." }, { status: 500 });
  }
}
