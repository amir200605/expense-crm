"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskFormSheet } from "@/components/tasks/task-form-sheet";
import { formatDateTime } from "@/lib/utils";
import { CheckSquare, Plus, Check } from "lucide-react";

async function fetchTasks() {
  const res = await fetch("/api/tasks?limit=50");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function toggleTaskStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: newStatus,
      ...(newStatus === "COMPLETED" ? { completedAt: new Date().toISOString() } : { completedAt: null }),
    }),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export default function TasksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const items = data?.items ?? [];
  const pending = items.filter((t: { status: string }) => t.status !== "COMPLETED");

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => toggleTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tasks" description="Your assigned tasks" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={pending.length > 0 ? `${pending.length} pending · ${items.length} total` : "Tasks assigned to you"}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add task
          </Button>
        }
      />
      <TaskFormSheet open={formOpen} onOpenChange={setFormOpen} />
      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">My tasks</CardTitle>
          <CardDescription>Call, follow up, and complete tasks linked to leads and clients</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              icon={<CheckSquare />}
              title="No tasks"
              description="Click 'Add task' to create your first task."
              action={{ label: "Add task", onClick: () => setFormOpen(true) }}
            />
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((task: { id: string; title: string; type: string; dueDate: string; status: string; lead: { id: string; fullName: string | null } | null }) => (
                    <TableRow key={task.id} className={task.status === "COMPLETED" ? "opacity-60" : ""}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate({ id: task.id, status: task.status })}
                          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                            task.status === "COMPLETED"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {task.status === "COMPLETED" && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </TableCell>
                      <TableCell className={`font-medium ${task.status === "COMPLETED" ? "line-through" : ""}`}>{task.title}</TableCell>
                      <TableCell><Badge variant="outline">{task.type?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateTime(task.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={task.status === "COMPLETED" ? "secondary" : "default"}>{task.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.lead ? (
                          <Link href={`/leads/${task.lead.id}`} className="text-primary hover:underline">{task.lead.fullName ?? "Lead"}</Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {task.lead && (
                          <Link href={`/leads/${task.lead.id}`}><Button variant="ghost" size="sm">Open</Button></Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
