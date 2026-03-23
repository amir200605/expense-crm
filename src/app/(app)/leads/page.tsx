"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Trash2, Users, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getDispositionBadgeVariant, getStageBadgeVariant } from "@/lib/status-pill";
import { LeadFormSheet } from "@/components/leads/lead-form-sheet";
import { prefetchLeadDetail } from "@/lib/queries/leads";

interface TeamMember {
  id: string;
  name: string | null;
  username: string | null;
  role: string;
}

async function fetchLeads(params: { page?: number; search?: string; disposition?: string; pipelineStage?: string }) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.search) sp.set("search", params.search);
  if (params.disposition) sp.set("disposition", params.disposition);
  if (params.pipelineStage) sp.set("pipelineStage", params.pipelineStage);
  const res = await fetch(`/api/leads?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

async function fetchTeam(): Promise<{ members: TeamMember[] }> {
  const res = await fetch("/api/team/assignable");
  if (!res.ok) return { members: [] };
  return res.json();
}

const DISPOSITION_OPTIONS = [
  { value: "", label: "All dispositions" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "APPOINTMENT_SET", label: "Appointment Set" },
  { value: "SOLD", label: "Sold" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
];

const STAGE_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "CONTACTING", label: "Contacting" },
  { value: "QUOTED", label: "Quoted" },
  { value: "APPOINTMENT_SET", label: "Appointment Set" },
  { value: "PLACED", label: "Placed" },
];

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editLeadId = searchParams.get("edit");
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showDeleteLead = role && role !== "QA_COMPLIANCE";

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [disposition, setDisposition] = useState("");
  const [pipelineStage, setPipelineStage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, searchDebounced, disposition, pipelineStage],
    queryFn: () =>
      fetchLeads({
        page,
        search: searchDebounced || undefined,
        disposition: disposition || undefined,
        pipelineStage: pipelineStage || undefined,
      }),
    staleTime: 45_000,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 5 * 60_000,
  });

  const agents = (teamData?.members ?? []).filter(
    (m) => m.role === "AGENT" || m.role === "MANAGER" || m.role === "AGENCY_OWNER"
  );

  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete lead");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string | null }) => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAgentId: agentId }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchDebounced(search);
    setPage(1);
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Manage and track your leads"
        actions={
          <Button onClick={() => { setFormOpen(true); router.replace("/leads"); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add lead
          </Button>
        }
      />
      <LeadFormSheet
        open={formOpen || Boolean(editLeadId)}
        leadId={editLeadId}
        onOpenChange={(next) => {
          if (!next && editLeadId) {
            router.replace("/leads");
          }
          setFormOpen(next);
        }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lead?</DialogTitle>
            <DialogDescription>
              Permanently remove {deleteTarget?.name ?? "this lead"}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={disposition || "all"} onValueChange={(v) => { setDisposition(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Disposition" />
              </SelectTrigger>
              <SelectContent>
                {DISPOSITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pipelineStage || "all"} onValueChange={(v) => { setPipelineStage(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">Apply</Button>
            {(searchDebounced || disposition || pipelineStage) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setSearchDebounced(""); setDisposition(""); setPipelineStage(""); setPage(1); }}
              >
                <X className="mr-1 h-4 w-4" /> Clear filters
              </Button>
            )}
          </form>

          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Users />}
                title="No leads found"
                description="Add your first lead or adjust filters to see more results."
                action={{ label: "Add lead", onClick: () => setFormOpen(true) }}
              />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Disposition</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Assigned Agent</TableHead>
                      <TableHead>Last contacted</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((lead: { id: string; fullName: string; firstName: string; lastName: string; phone: string; email: string | null; disposition: string; pipelineStage: string; assignedAgent: { id?: string; name: string | null } | null; assignedAgentId: string | null; lastContactedAt: string | null }) => (
                      <TableRow
                        key={lead.id}
                        onMouseEnter={() => prefetchLeadDetail(queryClient, lead.id)}
                      >
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                            {lead.fullName || `${lead.firstName} ${lead.lastName}`}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{lead.phone}</TableCell>
                        <TableCell>
                          <Badge variant={getDispositionBadgeVariant(lead.disposition)} className="font-normal">{lead.disposition?.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStageBadgeVariant(lead.pipelineStage)}>{lead.pipelineStage?.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.assignedAgent?.id ?? lead.assignedAgentId ?? "unassigned"}
                            onValueChange={(v) => assignMutation.mutate({ leadId: lead.id, agentId: v === "unassigned" ? null : v })}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
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
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{lead.lastContactedAt ? formatDate(lead.lastContactedAt) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/leads/${lead.id}`}
                              onMouseEnter={() => prefetchLeadDetail(queryClient, lead.id)}
                            >
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                            {showDeleteLead && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Delete lead"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: lead.id,
                                    name: lead.fullName || `${lead.firstName} ${lead.lastName}`,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {(totalPages > 1 || total > 0) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
