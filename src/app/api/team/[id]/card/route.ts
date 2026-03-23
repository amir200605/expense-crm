import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAgency } from "@/lib/permissions";
import { safeCardFilePathFromPublicUrl } from "@/lib/uploads/card-path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function authorizeTeamMemberEdit(session: Session | null, targetUserId: string) {
  if (!session?.user) return { error: "Unauthorized" as const, status: 401 as const };
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target?.agencyId) return { error: "User not found" as const, status: 404 as const };
  if (!canManageAgency(session, target.agencyId)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }
  return { target };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const auth = await authorizeTeamMemberEdit(session, id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { target } = auth;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use JPEG, PNG, or WebP" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "agent-cards");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${Date.now()}.${ext}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, buf);
  const publicUrl = `/uploads/agent-cards/${filename}`;

  if (target.cardImageUrl) {
    const oldPath = safeCardFilePathFromPublicUrl(target.cardImageUrl);
    if (oldPath) await unlink(oldPath).catch(() => {});
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { cardImageUrl: publicUrl },
    select: { id: true, cardImageUrl: true, name: true, email: true, role: true, username: true },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const auth = await authorizeTeamMemberEdit(session, id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { target } = auth;

  if (target.cardImageUrl) {
    const oldPath = safeCardFilePathFromPublicUrl(target.cardImageUrl);
    if (oldPath) await unlink(oldPath).catch(() => {});
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { cardImageUrl: null },
    select: { id: true, cardImageUrl: true, name: true, email: true, role: true, username: true },
  });
  return NextResponse.json({ user: updated });
}
