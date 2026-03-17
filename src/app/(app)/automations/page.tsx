"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Plus, Workflow, Zap, Trash2, Copy, MoreHorizontal,
  UserPlus, Bell, FileText, Clock, ShieldAlert, Calendar,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatDateTime } from "@/lib/utils";
import { AUTOMATION_TEMPLATES } from "@/lib/automation-templates";

interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  actions: { id: string; type: string; config?: Record<string, unknown> }[];
  createdAt: string;
  updatedAt: string;
  _count: { runs: number };
}

const TRIGGER_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  LEAD_CREATED: { label: "New Lead Created", icon: UserPlus, color: "bg-emerald-500/10 text-emerald-600" },
  LEAD_ASSIGNED: { label: "Lead Assigned", icon: UserPlus, color: "bg-blue-500/10 text-blue-600" },
  STATUS_CHANGED: { label: "Status Changed", icon: Zap, color: "bg-amber-500/10 text-amber-600" },
  NO_CONTACT_DAYS: { label: "No Contact (Days)", icon: Clock, color: "bg-red-500/10 text-red-600" },
  APPOINTMENT_SET: { label: "Appointment Set", icon: Calendar, color: "bg-violet-500/10 text-violet-600" },
  APPOINTMENT_MISSED: { label: "Appointment Missed", icon: Bell, color: "bg-rose-500/10 text-rose-600" },
  POLICY_APPROVED: { label: "Policy Approved", icon: FileText, color: "bg-teal-500/10 text-teal-600" },
  BIRTHDAY_UPCOMING: { label: "Birthday Upcoming", icon: Calendar, color: "bg-pink-500/10 text-pink-600" },
  DRAFT_DATE_APPROACHING: { label: "Draft Date Approaching", icon: Clock, color: "bg-orange-500/10 text-orange-600" },
  CHARGEBACK_RISK: { label: "Chargeback Risk", icon: ShieldAlert, color: "bg-red-500/10 text-red-600" },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_TASK: "Create Task",
  SEND_SMS: "Send SMS",
  SEND_EMAIL: "Send Email",
  ADD_TAG: "Add Tag",
  CHANGE_STAGE: "Change Stage",
  CHANGE_DISPOSITION: "Change Disposition",
  ASSIGN_AGENT: "Assign Agent",
  SET_NEXT_FOLLOW_UP: "Set Next Follow-Up",
  ADD_NOTE: "Add Note",
  NOTIFY_AGENT: "Notify Agent",
  WAIT: "Wait / Delay",
};

async function fetchAutomations(): Promise<{ automations: Automation[] }> {
  const res = await fetch("/api/automations");
  if (!res.ok) throw new Error("Failed to load automations");
  return res.json();
}

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["automations"],
    queryFn: fetchAutomations,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (auto: Automation) => {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${auto.name} (copy)`,
          trigger: auto.trigger,
          actions: auto.actions,
          enabled: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const createFromTemplate = useMutation({
    mutationFn: async (template: typeof AUTOMATION_TEMPLATES[0]) => {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          trigger: template.trigger,
          triggerConfig: template.triggerConfig,
          actions: template.actions,
          enabled: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      if (data.automation?.id) {
        window.location.href = `/automations/${data.automation.id}`;
      }
    },
  });

  const automations = (data?.automations ?? []).filter((a) => {
    if (filter === "active") return a.enabled;
    if (filter === "inactive") return !a.enabled;
    return true;
  });

  const totalActive = (data?.automations ?? []).filter((a) => a.enabled).length;
  const totalInactive = (data?.automations ?? []).filter((a) => !a.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Automate repetitive tasks with trigger-based workflows"
        actions={
          <Button asChild>
            <Link href="/automations/new">
              <Plus className="mr-2 h-4 w-4" />
              Create workflow
            </Link>
          </Button>
        }
      />

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          All ({data?.automations?.length ?? 0})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filter === "active" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Active ({totalActive})
        </button>
        <button
          onClick={() => setFilter("inactive")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filter === "inactive" ? "bg-slate-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Inactive ({totalInactive})
        </button>
      </div>

      {isError && <p className="text-sm text-destructive">Failed to load automations.</p>}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<Workflow />}
            title={filter === "all" ? "No automations yet" : `No ${filter} automations`}
            description="Create your first workflow to automate tasks, emails, and lead management."
            action={filter === "all" ? { label: "Create workflow", onClick: () => window.location.href = "/automations/new" } : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {automations.map((auto) => {
            const triggerInfo = TRIGGER_META[auto.trigger] ?? { label: auto.trigger, icon: Zap, color: "bg-muted text-muted-foreground" };
            const TriggerIcon = triggerInfo.icon;
            return (
              <Card key={auto.id} className="group relative border-border/80 shadow-soft transition-shadow hover:shadow-card">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/automations/${auto.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {auto.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={auto.enabled}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: auto.id, enabled: checked })}
                        className="scale-90"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/automations/${auto.id}`}>Edit workflow</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(auto)}>
                            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete "${auto.name}"? This cannot be undone.`)) deleteMutation.mutate(auto.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Trigger badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${triggerInfo.color}`}>
                      <TriggerIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">When: {triggerInfo.label}</span>
                  </div>

                  {/* Actions chain */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {auto.actions.slice(0, 4).map((action, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                        {ACTION_LABELS[action.type] ?? action.type}
                      </Badge>
                    ))}
                    {auto.actions.length > 4 && (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        +{auto.actions.length - 4} more
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-[10px] text-muted-foreground">
                      {auto._count.runs} run{auto._count.runs !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Updated {formatDateTime(auto.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Templates Section */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">Get started quickly with pre-built workflows</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUTOMATION_TEMPLATES.map((tpl) => {
            const triggerInfo = TRIGGER_META[tpl.trigger];
            const TplIcon = triggerInfo?.icon ?? Zap;
            return (
              <Card key={tpl.id} className="border-border/60 border-dashed transition-colors hover:border-primary/40 hover:shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white", triggerInfo?.color?.replace("/10", "") ?? "bg-muted")}>
                      <TplIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tpl.actions.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                        {ACTION_LABELS[a.type] ?? a.type}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full text-xs"
                    onClick={() => createFromTemplate.mutate(tpl)}
                    disabled={createFromTemplate.isPending}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    Use template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
