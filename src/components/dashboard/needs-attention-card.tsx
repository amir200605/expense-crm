"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function fetchNeedsAttention(params: { agencyId: string; managerId?: string; agentId?: string }) {
  const sp = new URLSearchParams({ agencyId: params.agencyId });
  if (params.managerId) sp.set("managerId", params.managerId);
  if (params.agentId) sp.set("agentId", params.agentId);
  const res = await fetch(`/api/dashboard/needs-attention?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

type NeedsAttentionCardProps = {
  agencyId: string;
  managerId?: string;
  agentId?: string;
  title?: string;
};

export function NeedsAttentionCard({ agencyId, managerId, agentId, title = "Leads needing attention" }: NeedsAttentionCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["needs-attention", agencyId, managerId ?? "", agentId ?? ""],
    queryFn: () => fetchNeedsAttention({ agencyId, managerId, agentId }),
    enabled: !!agencyId,
  });

  const leads = data?.leads ?? [];

  if (isLoading) {
    return (
      <Card className="card-insight overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-insight-muted text-insight [&_svg]:h-4 [&_svg]:w-4">
              <AlertCircle className="h-4 w-4" />
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-insight overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-insight-muted text-insight [&_svg]:h-4 [&_svg]:w-4">
            <AlertCircle className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-ups due today.</p>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead: { id: string; fullName: string; disposition: string; pipelineStage: string; nextFollowUpAt: string | null; assignedAgentName: string | null }) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60 hover:border-primary/30"
                >
                  <span className="font-medium text-foreground">{lead.fullName}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-normal text-xs">
                      {String(lead.disposition).replace(/_/g, " ")}
                    </Badge>
                    {lead.nextFollowUpAt && (
                      <span className="text-muted-foreground text-xs">
                        {formatDate(lead.nextFollowUpAt)}
                      </span>
                    )}
                    {lead.assignedAgentName && (
                      <span className="text-muted-foreground text-xs">{lead.assignedAgentName}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
