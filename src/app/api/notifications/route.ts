import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = body.id as string | undefined;
  const markAllRead = body.markAllRead === true;

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
