import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAgency } from "@/lib/permissions";
import type { SessionUser } from "@/lib/permissions";
import { resolveAgencyIdForSession } from "@/lib/session-agency";
import { z } from "zod";

/** Empty strings from the form become null (clear field) or undefined (skip update). */
const updateSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),
  role: z.enum(["AGENT", "MANAGER", "AGENCY_OWNER"]).optional(),
  username: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === "" || v === null) return null;
      return typeof v === "string" ? v.trim() : v;
    },
    z.union([z.string().min(1), z.null()]).optional()
  ),
  phone: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === "" || v === null) return null;
      return typeof v === "string" ? v.trim() : v;
    },
    z.union([z.string(), z.null()]).optional()
  ),
  npnNumber: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === "" || v === null) return null;
      return typeof v === "string" ? v.trim() : v;
    },
    z.union([z.string(), z.null()]).optional()
  ),
  cardImageUrl: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === "" || v === null) return null;
      return typeof v === "string" ? v.trim() : v;
    },
    z.union([z.string(), z.null()]).optional()
  ),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target?.agencyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const sessionAgencyId = await resolveAgencyIdForSession(user);
  if (!canManageAgency(session, target.agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role !== "SUPER_ADMIN" && sessionAgencyId && target.agencyId !== sessionAgencyId) {
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

  const selectWithCard = {
    id: true,
    name: true,
    email: true,
    role: true,
    username: true,
    avatarUrl: true,
    cardImageUrl: true,
    phone: true,
    npnNumber: true,
  } as const;

  const selectWithoutCard = {
    id: true,
    name: true,
    email: true,
    role: true,
    username: true,
    avatarUrl: true,
    phone: true,
    npnNumber: true,
  } as const;

  const selectLegacy = {
    id: true,
    name: true,
    email: true,
    role: true,
    username: true,
    avatarUrl: true,
    phone: true,
  } as const;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: selectWithCard,
    });
    return NextResponse.json({ user: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const target = (e.meta?.target as string[] | undefined)?.join(", ") ?? "field";
        return NextResponse.json(
          { error: target.includes("username") ? "That username is already taken" : "A unique field already exists" },
          { status: 409 }
        );
      }
      // DB missing newer columns (migration not applied)
      if (e.code === "P2022") {
        const { cardImageUrl: _c, npnNumber: _n, ...dataWithoutCard } = parsed.data as Record<string, unknown>;
        const updated = await prisma.user.update({
          where: { id },
          data: dataWithoutCard,
          select: selectLegacy,
        });
        return NextResponse.json({ user: { ...updated, cardImageUrl: null, npnNumber: null } });
      }
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      // Prisma client may be older than schema (unknown args/fields)
      const { cardImageUrl: _c, npnNumber: _n, ...dataLegacy } = parsed.data as Record<string, unknown>;
      const updated = await prisma.user.update({
        where: { id },
        data: dataLegacy,
        select: selectLegacy,
      });
      return NextResponse.json({ user: { ...updated, cardImageUrl: null, npnNumber: null } });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target?.agencyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const sessionAgencyId = await resolveAgencyIdForSession(user);
  if (!canManageAgency(session, target.agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role !== "SUPER_ADMIN" && sessionAgencyId && target.agencyId !== sessionAgencyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete super admins" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
