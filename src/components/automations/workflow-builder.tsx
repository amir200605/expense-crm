"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Trash2, Save, Zap, UserPlus, Bell, FileText, Clock, ShieldAlert,
  Calendar, MessageSquare, Mail, Tag, GitBranch,
  UserCheck, Pause, ChevronDown, ChevronUp, Play,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDateTime } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────
interface ActionNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface AutomationData {
  id?: string;
  name: string;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  actions: ActionNode[];
  enabled: boolean;
}

// ─── Trigger definitions ─────────────────────────────────────────
const TRIGGERS = [
  { value: "LEAD_CREATED", label: "New Lead Created", description: "Fires when a new lead is added (including from the website “Get in touch” form)", icon: UserPlus, color: "bg-emerald-500" },
  { value: "LEAD_ASSIGNED", label: "Lead Assigned", description: "Fires when a lead is assigned to an agent", icon: UserCheck, color: "bg-blue-500" },
  { value: "STATUS_CHANGED", label: "Status Changed", description: "Fires when a lead's disposition or stage changes", icon: Zap, color: "bg-amber-500" },
  { value: "NO_CONTACT_DAYS", label: "No Contact (Days)", description: "Fires when a lead hasn't been contacted for X days", icon: Clock, color: "bg-red-500" },
  { value: "APPOINTMENT_SET", label: "Appointment Set", description: "Fires when an appointment is scheduled", icon: Calendar, color: "bg-violet-500" },
  { value: "APPOINTMENT_MISSED", label: "Appointment Missed", description: "Fires when an appointment is missed", icon: Bell, color: "bg-rose-500" },
  { value: "POLICY_APPROVED", label: "Policy Approved", description: "Fires when a policy status becomes approved", icon: FileText, color: "bg-teal-500" },
  { value: "BIRTHDAY_UPCOMING", label: "Birthday Upcoming", description: "Fires X days before a lead/client birthday", icon: Calendar, color: "bg-pink-500" },
  { value: "DRAFT_DATE_APPROACHING", label: "Draft Date Approaching", description: "Fires before a policy draft date", icon: Clock, color: "bg-orange-500" },
  { value: "CHARGEBACK_RISK", label: "Chargeback Risk", description: "Fires on potential chargeback indicators", icon: ShieldAlert, color: "bg-red-600" },
];

// ─── Action definitions ──────────────────────────────────────────
const ACTIONS = [
  { value: "CREATE_TASK", label: "Create Task", icon: FileText, color: "bg-blue-500" },
  { value: "SEND_SMS", label: "Send SMS", icon: MessageSquare, color: "bg-green-500" },
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail, color: "bg-indigo-500" },
  { value: "ADD_TAG", label: "Add Tag", icon: Tag, color: "bg-purple-500" },
  { value: "CHANGE_STAGE", label: "Change Stage", icon: GitBranch, color: "bg-cyan-500" },
  { value: "CHANGE_DISPOSITION", label: "Change Disposition", icon: Zap, color: "bg-amber-500" },
  { value: "ASSIGN_AGENT", label: "Assign Agent", icon: UserCheck, color: "bg-teal-500" },
  { value: "SET_NEXT_FOLLOW_UP", label: "Set Next Follow-Up Date", icon: Calendar, color: "bg-violet-500" },
  { value: "ADD_NOTE", label: "Add Note to Lead", icon: FileText, color: "bg-slate-600" },
  { value: "NOTIFY_AGENT", label: "Notify Agent / Manager", icon: Bell, color: "bg-rose-500" },
  { value: "WAIT", label: "Wait / Delay", icon: Pause, color: "bg-slate-500" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Action Config Panel ─────────────────────────────────────────
function ActionConfigFields({ action, onChange }: { action: ActionNode; onChange: (config: Record<string, unknown>) => void }) {
  const c = action.config;
  const set = (key: string, val: unknown) => onChange({ ...c, [key]: val });

  switch (action.type) {
    case "CREATE_TASK":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Task Title</Label>
            <Input value={(c.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Follow up with lead" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due In (days)</Label>
            <Input type="number" value={(c.dueInDays as number) ?? 1} onChange={(e) => set("dueInDays", parseInt(e.target.value) || 1)} />
          </div>
        </div>
      );
    case "SEND_SMS":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Send to</Label>
            <Select
              value={(c.sendTo as string) ?? "lead_phone"}
              onValueChange={(v) => set("sendTo", v)}
            >
              <SelectTrigger><SelectValue placeholder="Who receives the SMS?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_phone">Lead&apos;s phone</SelectItem>
                <SelectItem value="client_phone">Client&apos;s phone</SelectItem>
                <SelectItem value="custom">Custom number</SelectItem>
              </SelectContent>
            </Select>
            {(c.sendTo as string) === "custom" && (
              <Input
                value={(c.customPhone as string) ?? ""}
                onChange={(e) => set("customPhone", e.target.value)}
                placeholder="+1234567890"
                className="mt-1.5"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea value={(c.message as string) ?? ""} onChange={(e) => set("message", e.target.value)} placeholder="Hi {{firstName}}, ..." rows={3} />
            <p className="text-[10px] text-muted-foreground">Variables: {"{{firstName}}, {{lastName}}, {{phone}}, {{agentName}}"}</p>
          </div>
        </div>
      );
    case "SEND_EMAIL":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Send to</Label>
            <Select
              value={(c.sendTo as string) ?? "lead_email"}
              onValueChange={(v) => set("sendTo", v)}
            >
              <SelectTrigger><SelectValue placeholder="Who receives the email?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_email">Lead&apos;s email</SelectItem>
                <SelectItem value="client_email">Client&apos;s email</SelectItem>
                <SelectItem value="assigned_agent">Assigned agent&apos;s email</SelectItem>
                <SelectItem value="custom">Custom email address</SelectItem>
              </SelectContent>
            </Select>
            {(c.sendTo as string) === "custom" && (
              <Input
                type="email"
                value={(c.customEmail as string) ?? ""}
                onChange={(e) => set("customEmail", e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1.5"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input value={(c.subject as string) ?? ""} onChange={(e) => set("subject", e.target.value)} placeholder="Following up on your inquiry" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Body</Label>
            <Textarea value={(c.body as string) ?? ""} onChange={(e) => set("body", e.target.value)} rows={4} />
          </div>
        </div>
      );
    case "ADD_TAG":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Tag Name</Label>
          <Input value={(c.tag as string) ?? ""} onChange={(e) => set("tag", e.target.value)} placeholder="hot-lead" />
        </div>
      );
    case "CHANGE_STAGE":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">New Stage</Label>
          <Select value={(c.stage as string) ?? ""} onValueChange={(v) => set("stage", v)}>
            <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW_LEAD">New Lead</SelectItem>
              <SelectItem value="CONTACTING">Contacting</SelectItem>
              <SelectItem value="QUOTED">Quoted</SelectItem>
              <SelectItem value="APPOINTMENT_SET">Appointment Set</SelectItem>
              <SelectItem value="PLACED">Placed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "CHANGE_DISPOSITION":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">New Disposition</Label>
          <Select value={(c.disposition as string) ?? ""} onValueChange={(v) => set("disposition", v)}>
            <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="INTERESTED">Interested</SelectItem>
              <SelectItem value="APPOINTMENT_SET">Appointment Set</SelectItem>
              <SelectItem value="SOLD">Sold</SelectItem>
              <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "ASSIGN_AGENT":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Assignment Rule</Label>
          <Select value={(c.rule as string) ?? "round_robin"} onValueChange={(v) => set("rule", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">Round Robin</SelectItem>
              <SelectItem value="least_leads">Least Leads</SelectItem>
              <SelectItem value="specific">Specific Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "SET_NEXT_FOLLOW_UP":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Days from now</Label>
          <Input type="number" min={0} value={(c.daysFromNow as number) ?? 1} onChange={(e) => set("daysFromNow", parseInt(e.target.value) || 1)} />
          <p className="text-[10px] text-muted-foreground">Sets the lead&apos;s &quot;Next follow-up&quot; date so it appears in your dashboard.</p>
        </div>
      );
    case "ADD_NOTE":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Note text</Label>
          <Textarea value={(c.note as string) ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Automation: follow-up email sent" rows={2} />
        </div>
      );
    case "NOTIFY_AGENT":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Notify</Label>
            <Select value={(c.sendTo as string) ?? "assigned_agent"} onValueChange={(v) => set("sendTo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned_agent">Assigned agent</SelectItem>
                <SelectItem value="manager">Assigned manager</SelectItem>
                <SelectItem value="agency_owner">Agency owner (admin)</SelectItem>
                <SelectItem value="custom">Custom email</SelectItem>
              </SelectContent>
            </Select>
            {(c.sendTo as string) === "custom" && (
              <Input type="email" value={(c.customEmail as string) ?? ""} onChange={(e) => set("customEmail", e.target.value)} placeholder="email@example.com" className="mt-1.5" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea value={(c.message as string) ?? ""} onChange={(e) => set("message", e.target.value)} placeholder="This lead needs your attention." rows={2} />
          </div>
        </div>
      );
    case "WAIT":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <Input type="number" value={(c.duration as number) ?? 1} onChange={(e) => set("duration", parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unit</Label>
            <Select value={(c.unit as string) ?? "days"} onValueChange={(v) => set("unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// ─── Trigger Config Panel ────────────────────────────────────────
function TriggerConfigFields({ trigger, config, onChange }: { trigger: string; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  switch (trigger) {
    case "NO_CONTACT_DAYS":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Days without contact</Label>
          <Input type="number" value={(config.days as number) ?? 3} onChange={(e) => set("days", parseInt(e.target.value) || 3)} />
        </div>
      );
    case "STATUS_CHANGED":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From status (optional)</Label>
            <Select value={(config.fromStatus as string) ?? "any"} onValueChange={(v) => set("fromStatus", v === "any" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="INTERESTED">Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To status (optional)</Label>
            <Select value={(config.toStatus as string) ?? "any"} onValueChange={(v) => set("toStatus", v === "any" ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="INTERESTED">Interested</SelectItem>
                <SelectItem value="APPOINTMENT_SET">Appointment Set</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case "BIRTHDAY_UPCOMING":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Days before birthday</Label>
          <Input type="number" value={(config.daysBefore as number) ?? 7} onChange={(e) => set("daysBefore", parseInt(e.target.value) || 7)} />
        </div>
      );
    default:
      return null;
  }
}

// ─── Main Builder ────────────────────────────────────────────────
export function WorkflowBuilder({ automationId }: { automationId?: string }) {
  const router = useRouter();
  const isEdit = !!automationId;

  const [name, setName] = useState("Untitled Workflow");
  const [trigger, setTrigger] = useState("");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [actions, setActions] = useState<ActionNode[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [editingActionIdx, setEditingActionIdx] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLeadId, setTestLeadId] = useState("");
  const [testResult, setTestResult] = useState<{ status: string; steps: { type: string; status: string; detail?: string }[]; error?: string } | null>(null);

  const { data: existing } = useQuery({
    queryKey: ["automation", automationId],
    queryFn: async () => {
      const res = await fetch(`/api/automations/${automationId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.automation) {
      const a = existing.automation;
      setName(a.name);
      setTrigger(a.trigger);
      setTriggerConfig(a.triggerConfig ?? {});
      setActions(a.actions ?? []);
      setEnabled(a.enabled);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data: AutomationData) => {
      const url = isEdit ? `/api/automations/${automationId}` : "/api/automations";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDirty(false);
      if (!isEdit && data.automation?.id) {
        router.push(`/automations/${data.automation.id}`);
      }
    },
  });

  const handleSave = () => {
    if (!trigger) return;
    if (actions.length === 0) return;
    saveMutation.mutate({ name, trigger, triggerConfig, actions, enabled });
  };

  const testRunMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/automations/${automationId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim() || undefined, leadId: testLeadId || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      return data;
    },
    onSuccess: (data) => {
      setTestResult({ status: data.status, steps: data.steps ?? [], error: data.error });
    },
    onError: (err: Error) => {
      setTestResult({ status: "failed", steps: [], error: err.message });
    },
  });

  const addAction = (type: string) => {
    const newAction: ActionNode = { id: generateId(), type, config: {} };
    setActions((prev) => [...prev, newAction]);
    setDirty(true);
    setActionSheetOpen(false);
  };

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const moveAction = useCallback((idx: number, dir: "up" | "down") => {
    setActions((prev) => {
      const arr = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
    setDirty(true);
  }, []);

  const updateActionConfig = (idx: number, config: Record<string, unknown>) => {
    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, config } : a));
    setDirty(true);
  };

  const triggerInfo = TRIGGERS.find((t) => t.value === trigger);

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/automations">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            className="h-9 max-w-xs border-0 bg-transparent text-lg font-semibold focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Active</Label>
            <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setDirty(true); }} />
          </div>
          {isEdit && (
            <Dialog open={testDialogOpen} onOpenChange={(open) => { setTestDialogOpen(open); if (!open) setTestResult(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!trigger || actions.length === 0}>
                  <Play className="mr-2 h-4 w-4" />
                  Test run
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Test workflow</DialogTitle>
                  <DialogDescription>
                    Run this workflow once. Save changes first. For Send Email steps, use the address below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Send test emails to (for email steps)</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  {testResult && (
                    <div className={cn("rounded-lg border p-3 text-sm", testResult.status === "completed" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-destructive/50 bg-destructive/5")}>
                      <p className="font-medium">{testResult.status === "completed" ? "Run completed" : "Run failed"}</p>
                      {testResult.error && <p className="mt-1 text-destructive">{testResult.error}</p>}
                      <ul className="mt-2 space-y-1">
                        {testResult.steps.map((s, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className={s.status === "completed" ? "text-emerald-600" : "text-destructive"}>{s.type}</span>
                            <span className="text-muted-foreground">— {s.status}{s.detail ? `: ${s.detail}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Close</Button>
                  <Button onClick={() => testRunMutation.mutate()} disabled={testRunMutation.isPending}>
                    {testRunMutation.isPending ? "Running…" : "Run test"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending || !trigger || actions.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-destructive">{saveMutation.error.message}</p>
      )}

      {/* Workflow canvas */}
      <div className="flex flex-col items-center gap-0">

        {/* ── Trigger Node ── */}
        <Card className={cn(
          "w-full max-w-lg border-2 transition-colors",
          trigger ? "border-primary/30 shadow-card" : "border-dashed border-border"
        )}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", triggerInfo?.color ?? "bg-muted")}>
                {triggerInfo ? <triggerInfo.icon className="h-4 w-4" /> : <Zap className="h-4 w-4 text-muted-foreground" />}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger</p>
                <p className="text-sm font-medium">{triggerInfo?.label ?? "Select a trigger"}</p>
              </div>
            </div>
            <Select value={trigger || "none"} onValueChange={(v) => { setTrigger(v === "none" ? "" : v); setTriggerConfig({}); setDirty(true); }}>
              <SelectTrigger><SelectValue placeholder="Choose what starts this workflow" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Choose a trigger...</SelectItem>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trigger && <TriggerConfigFields trigger={trigger} config={triggerConfig} onChange={(c) => { setTriggerConfig(c); setDirty(true); }} />}
            {triggerInfo?.description && (
              <p className="mt-2 text-[11px] text-muted-foreground">{triggerInfo.description}</p>
            )}
          </div>
        </Card>

        {/* Connector */}
        {trigger && <div className="h-8 w-px bg-border" />}

        {/* ── Action Nodes ── */}
        {actions.map((action, idx) => {
          const actionInfo = ACTIONS.find((a) => a.value === action.type);
          const ActionIcon = actionInfo?.icon ?? Zap;
          const isExpanded = editingActionIdx === idx;

          return (
            <div key={action.id} className="flex flex-col items-center gap-0 w-full max-w-lg">
              <Card className="w-full border border-border/80 shadow-soft">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveAction(idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveAction(idx, "down")} disabled={idx === actions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", actionInfo?.color ?? "bg-muted")}>
                        <ActionIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step {idx + 1}</p>
                        <p className="text-sm font-medium">{actionInfo?.label ?? action.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingActionIdx(isExpanded ? null : idx)}
                      >
                        {isExpanded ? "Collapse" : "Configure"}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAction(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <ActionConfigFields action={action} onChange={(config) => updateActionConfig(idx, config)} />
                    </div>
                  )}
                </div>
              </Card>
              {/* Connector */}
              <div className="h-8 w-px bg-border" />
            </div>
          );
        })}

        {/* ── Add Action Button ── */}
        {trigger && (
          <button
            onClick={() => setActionSheetOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition-all hover:border-primary hover:bg-primary/10 hover:scale-110"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Run history (edit mode) */}
      {isEdit && existing?.automation?.runs?.length > 0 && (
        <Card className="border-border/80 shadow-soft max-w-lg mx-auto">
          <div className="p-5">
            <h3 className="text-sm font-semibold mb-3">Recent Runs</h3>
            <div className="space-y-2">
              {existing.automation.runs.map((run: { id: string; status: string; startedAt: string; completedAt: string | null }) => (
                <div key={run.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <Badge variant={run.status === "completed" ? "default" : run.status === "running" ? "secondary" : "destructive"} className="text-[10px]">
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">{formatDateTime(run.startedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Add Action Sheet ── */}
      <Sheet open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Action</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 py-4">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => addAction(a.value)}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-accent/50 hover:border-primary/30"
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", a.color)}>
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
