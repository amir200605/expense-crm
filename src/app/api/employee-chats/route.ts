import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!user.agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  const chats = await prisma.employeeChat.findMany({
    where: {
      agencyId: user.agencyId,
      OR: [{ userAId: user.id }, { userBId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, email: true, role: true } },
      userB: { select: { id: true, name: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, createdAt: true, senderId: true } },
    },
  });

  return NextResponse.json({ chats });
}

const createSchema = z.object({
  otherUserId: z.string().min(1),
  firstMessage: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!user.agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const other = await prisma.user.findFirst({
    where: { id: parsed.data.otherUserId, agencyId: user.agencyId },
    select: { id: true, name: true },
  });
  if (!other) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (other.id === user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const [userAId, userBId] = orderedPair(user.id!, other.id);

  const chat = await prisma.employeeChat.upsert({
    where: { agencyId_userAId_userBId: { agencyId: user.agencyId, userAId, userBId } },
    update: { updatedAt: new Date() },
    create: { agencyId: user.agencyId, userAId, userBId },
    include: {
      userA: { select: { id: true, name: true, email: true, role: true } },
      userB: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const msg = parsed.data.firstMessage?.trim();
  if (msg) {
    await prisma.employeeChatMessage.create({
      data: { chatId: chat.id, agencyId: user.agencyId, senderId: user.id!, body: msg },
    });
    // notify recipient
    const recipientId = other.id;
    await prisma.notification.create({
      data: {
        userId: recipientId,
        title: `New message from ${user.name ?? "Teammate"}`,
        message: msg.slice(0, 140),
        link: `/messages/${chat.id}`,
      },
    });
    await prisma.employeeChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });
  }

  return NextResponse.json({ chat });
}

