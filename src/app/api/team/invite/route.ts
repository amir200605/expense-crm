import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canAccessTeam, type SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSession } from "@/lib/session-agency";

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(64, "Username is too long"),
  password: z.string().min(8),
  role: z.enum(["AGENT", "MANAGER"]),
  phone: z.string().trim().optional(),
  npnNumber: z.string().trim().optional(),
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

    const { name, username, password, role, phone, npnNumber } = parsed.data;
    const normalized = username.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { username: normalized },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already taken." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Keep local part short (RFC 5321 max 64 chars before @). Username is globally unique in DB.
    const email = `${normalized}@placeholder.local`;

    await prisma.user.create({
      data: {
        name,
        username: normalized,
        email,
        password: hashed,
        agencyId,
        role,
        phone: phone || null,
        npnNumber: npnNumber || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/team/invite", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "A user with this username or email already exists." },
          { status: 400 }
        );
      }
      if (e.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid agency reference. Run migrations and ensure an agency exists." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Invite failed.";
    return NextResponse.json(
      {
        error: message,
        hint:
          process.env.NODE_ENV !== "production"
            ? "Check DATABASE_URL and that prisma migrate has been applied on this host."
            : undefined,
      },
      { status: 500 }
    );
  }
}
