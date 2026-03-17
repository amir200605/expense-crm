import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!user.agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  const { id } = await params;
  const chat = await prisma.employeeChat.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, email: true, role: true } },
      userB: { select: { id: true, name: true, email: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { sender: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!chat || chat.agencyId !== user.agencyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.userAId !== user.id && chat.userBId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ chat });
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!user.agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  const { id } = await params;
  const chat = await prisma.employeeChat.findUnique({ where: { id } });
  if (!chat || chat.agencyId !== user.agencyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.userAId !== user.id && chat.userBId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const msg = await prisma.employeeChatMessage.create({
    data: { chatId: chat.id, agencyId: user.agencyId, senderId: user.id!, body: parsed.data.body.trim() },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  const recipientId = chat.userAId === user.id ? chat.userBId : chat.userAId;
  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: `New message from ${user.name ?? "Teammate"}`,
      message: msg.body.slice(0, 140),
      link: `/messages/${chat.id}`,
    },
  });
  await prisma.employeeChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ message: msg });
}

