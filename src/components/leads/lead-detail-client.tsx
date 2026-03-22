"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2, UserCheck } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getDispositionBadgeVariant, getStageBadgeVariant } from "@/lib/status-pill";
import {
  fetchLeadById,
  fetchLeadSms,
  LEAD_DETAIL_STALE_MS,
  TEAM_STALE_MS,
} from "@/lib/queries/leads";

interface TeamMember {
  id: string;
  name: string | null;
  username: string | null;
  role: string;
}

export type LeadDetail = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  disposition: string;
  pipelineStage: string;
  source: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAgent: { id?: string; name: string | null; email: string | null } | null;
  assignedManager: { name: string | null } | null;
  client?: { id: string } | null;
};

async function fetchTeam(): Promise<{ members: TeamMember[] }> {
  const res = await fetch("/api/team");
  if (!res.ok) return { members: [] };
  return res.json();
}

export type LeadSmsMessage = {
  id: string;
  createdAt: string;
  to: string | null;
  message: string | null;
  sendTo: string | null;
  sent: boolean;
  source: string;
  sentByName: string | null;
};

function smsSourceLabel(source: string) {
  if (source === "client_welcome") return "Welcome SMS (client)";
  if (source === "automation") return "Automation";
  return source.replace(/_/g, " ");
}

export function LeadDetailClient({
  leadId,
  initialLead,
}: {
  leadId: string;
  initialLead: LeadDetail;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLeadById(leadId),
    initialData: initialLead,
    // Without this, initialData is treated as immediately stale → extra refetch on every open.
    initialDataUpdatedAt: Date.now(),
    staleTime: LEAD_DETAIL_STALE_MS,
  });

  const { data: smsData, isLoading: smsLoading } = useQuery({
    queryKey: ["lead-sms", leadId],
    queryFn: () => fetchLeadSms(leadId),
    enabled: activeTab === "communications",
    staleTime: 60_000,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: TEAM_STALE_MS,
  });

  const agents = (teamData?.members ?? []).filter(
    (m) => m.role === "AGENT" || m.role === "MANAGER" || m.role === "AGENCY_OWNER"
  );

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Convert failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-sms", leadId] });
      if (data?.client?.id) router.push(`/clients/${data.client.id}`);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (agentId: string | null) => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAgentId: agentId }),
      });
      if (!res.ok) throw new Error("Failed to reassign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete lead");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push("/leads");
      router.refresh();
    },
  });

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canDeleteLead =
    Boolean(role) &&
    role !== "QA_COMPLIANCE" &&
    ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER", "AGENT"].includes(role ?? "");

  if (isLoading && !lead) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const name = lead?.fullName || (lead ? `${lead.firstName} ${lead.lastName}` : "");
  const currentAgentId = lead?.assignedAgent?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={getDispositionBadgeVariant(lead?.disposition)} className="font-normal">{lead?.disposition?.replace(/_/g, " ") ?? "—"}</Badge>
              <Badge variant={getStageBadgeVariant(lead?.pipelineStage)}>{lead?.pipelineStage?.replace(/_/g, " ") ?? "—"}</Badge>
              {lead?.nextFollowUpAt && (
                <span className="text-sm text-muted-foreground">Follow-up: {formatDate(lead.nextFollowUpAt)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {lead?.disposition !== "SOLD" && !lead?.client && (
            <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting…" : "Convert to client"}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/leads?edit=${leadId}`}>Edit</Link>
          </Button>
          {canDeleteLead && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this lead?</DialogTitle>
            <DialogDescription>
              This permanently removes {name || "this lead"} and related data you’re allowed to delete. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {/* Assign Agent Card */}
          <Card className="border-border/80 shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Assigned Agent</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select
                  value={currentAgentId || "unassigned"}
                  onValueChange={(v) => assignMutation.mutate(v === "unassigned" ? null : v)}
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name ?? a.username ?? a.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignMutation.isPending && (
                  <span className="text-sm text-muted-foreground">Saving…</span>
                )}
                {assignMutation.isError && (
                  <span className="text-sm text-destructive">Failed</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</p>
                <p className="font-mono text-sm">{lead?.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="text-sm">{lead?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">City / State</p>
                <p className="text-sm">{[lead?.city, lead?.state].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</p>
                <p className="text-sm">{lead?.source ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last contacted</p>
                <p className="text-sm">{lead?.lastContactedAt ? formatDateTime(lead.lastContactedAt) : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next follow-up</p>
                <p className="text-sm">{lead?.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : "—"}</p>
              </div>
            </CardContent>
          </Card>
          {lead?.notes && (
            <Card className="border-border/80 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
          <Card className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Created {lead?.createdAt ? formatDateTime(lead.createdAt) : "—"} · Last updated {lead?.updatedAt ? formatDateTime(lead.updatedAt) : "—"}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline">
          <Card className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Notes and activity will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="communications">
          <Card className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle>Text messages (SMS)</CardTitle>
              <CardDescription>
                Outbound SMS tied to this lead (automations and welcome SMS on convert). Welcome SMS requires{" "}
                <strong>Telnyx</strong> (<code className="text-xs">TELNYX_API_KEY</code> and a From number in Settings →
                Integrations). If something was skipped or failed, you&apos;ll see a &quot;Not sent&quot; entry with the
                reason.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {smsLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : !smsData?.messages?.length ? (
                <p className="text-sm text-muted-foreground">No SMS logged for this lead yet.</p>
              ) : (
                <ul className="space-y-4">
                  {smsData.messages.map((m: LeadSmsMessage) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <span className="font-medium text-foreground">{formatDateTime(m.createdAt)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="font-normal">
                            {smsSourceLabel(m.source)}
                          </Badge>
                          {!m.sent && (
                            <Badge variant="destructive" className="text-xs">
                              Not sent
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        To: <span className="font-mono text-foreground">{m.to ?? "—"}</span>
                        {m.sendTo && (
                          <span className="ml-2">· Target: {m.sendTo.replace(/_/g, " ")}</span>
                        )}
                        {m.sentByName && <span className="ml-2">· By {m.sentByName}</span>}
                      </p>
                      {m.message && (
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-background/80 p-3 text-xs leading-relaxed text-foreground">
                          {m.message}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks">
          <Card className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Tasks linked to this lead</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
