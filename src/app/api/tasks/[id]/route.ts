import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTaskById, updateTask } from "@/lib/services/task.service";
import { updateTaskSchema } from "@/lib/validations/task";
import type { SessionUser } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;
  const task = await getTaskById(id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (user.role === "AGENT" && task.assignedToId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  const task = await getTaskById(id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (user.role === "AGENT" && task.assignedToId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const payload: { title?: string; description?: string; priority?: number; dueDate?: Date; status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; completedAt?: Date } = {};
  if (parsed.data.title != null) payload.title = parsed.data.title;
  if (parsed.data.description !== undefined) payload.description = parsed.data.description;
  if (parsed.data.priority !== undefined) payload.priority = parsed.data.priority;
  if (parsed.data.status != null) payload.status = parsed.data.status;
  if (parsed.data.dueDate) payload.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.completedAt) payload.completedAt = new Date(parsed.data.completedAt);
  const updated = await updateTask(id, payload);
  return NextResponse.json(updated);
}
