import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTasks, createTask } from "@/lib/services/task.service";
import { listTasksQuerySchema } from "@/lib/validations/task";
import { createTaskSchema } from "@/lib/validations/task";
import type { SessionUser } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { searchParams } = new URL(req.url);

  const requestedAssignee = searchParams.get("assignedToId") || user.id;
  // Agents can only see their own tasks
  const effectiveAssignee = user.role === "AGENT" ? user.id! : requestedAssignee;

  const parsed = listTasksQuerySchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    assignedToId: effectiveAssignee,
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
  const query = parsed.success ? parsed.data : listTasksQuerySchema.parse({});
  const result = await listTasks({
    ...query,
    assignedToId: query.assignedToId || user.id,
  });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const body = await req.json().catch(() => ({}));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const task = await createTask({
    ...parsed.data,
    dueDate: new Date(parsed.data.dueDate),
    assignedToId: parsed.data.assignedToId || user.id!,
  });
  return NextResponse.json(task, { status: 201 });
}
