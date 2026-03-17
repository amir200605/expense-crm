import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAgency } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["AGENT", "MANAGER", "AGENCY_OWNER"]).optional(),
  username: z.string().min(1).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId || !canManageAgency(session, agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.agencyId !== agencyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent editing yourself to a lower role or SUPER_ADMIN editing
  if (target.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot edit super admins" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, username: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId || !canManageAgency(session, agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.agencyId !== agencyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete super admins" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
