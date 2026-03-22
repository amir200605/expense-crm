"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { prefetchLeadDetail } from "@/lib/queries/leads";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { getDispositionBadgeVariant } from "@/lib/status-pill";
import { Kanban, Phone } from "lucide-react";

async function fetchPipeline() {
  const res = await fetch("/api/pipeline");
  if (!res.ok) throw new Error("Failed to fetch pipeline");
  return res.json();
}

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTING: "Contacting",
  QUOTED: "Quoted",
  APPOINTMENT_SET: "Appointment Set",
  APPLICATION_STARTED: "Application Started",
  UNDERWRITING: "Underwriting",
  APPROVED: "Approved",
  PLACED: "Placed",
  CHARGEBACK_RISK: "Chargeback Risk",
  LOST: "Lost",
};

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: fetchPipeline,
    staleTime: 45_000,
  });
  const stages = data?.stages ?? [];
  const byStage = data?.byStage ?? {};
  const totalLeads = stages.reduce((acc: number, s: string) => acc + (byStage[s] ?? []).length, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pipeline" description="Move leads through stages" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={`${totalLeads} leads across ${stages.length} stages · Click a card to open the lead`}
      />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage: string) => {
          const stageLeads = byStage[stage] ?? [];
          return (
            <Card key={stage} className="w-72 shrink-0 flex flex-col border-border/80 shadow-soft">
              <CardHeader className="py-3 px-4 border-b border-border/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{STAGE_LABELS[stage] ?? stage}</span>
                  <Badge variant="secondary" className="font-mono text-xs">{stageLeads.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] space-y-2 p-3 pt-3">
                {stageLeads.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">No leads</p>
                    <Link href="/leads" className="mt-2 inline-block text-xs text-primary hover:underline">Add lead</Link>
                  </div>
                ) : (
                  stageLeads.map((lead: { id: string; fullName: string | null; firstName: string; lastName: string; phone: string; disposition?: string; assignedAgent: { name: string | null } | null }) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      onMouseEnter={() => prefetchLeadDetail(queryClient, lead.id)}
                    >
                      <div className="rounded-lg border border-border/80 bg-card p-3 text-sm shadow-soft transition-colors hover:bg-muted/30 hover:border-primary/30">
                        <p className="font-medium truncate text-heading">{lead.fullName || `${lead.firstName} ${lead.lastName}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {lead.phone}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {lead.disposition && (
                            <Badge variant={getDispositionBadgeVariant(lead.disposition)} className="text-xs font-normal">
                              {lead.disposition.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {lead.assignedAgent?.name && (
                            <Badge variant="outline" className="text-xs font-normal">{lead.assignedAgent.name}</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {totalLeads === 0 && (
        <EmptyState
          icon={<Kanban />}
          title="No leads in pipeline"
          description="Add leads from the Leads page and they will appear here by stage."
        />
      )}
    </div>
  );
}
