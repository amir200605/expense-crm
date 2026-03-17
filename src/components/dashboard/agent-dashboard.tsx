"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { Users, CheckSquare, Clock, Calendar } from "lucide-react";

async function fetchAgentStats(agencyId: string, agentId: string) {
  const res = await fetch(`/api/dashboard/stats?agencyId=${agencyId}&agentId=${agentId}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function AgentDashboard({ agencyId, agentId }: { agencyId: string; agentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats-agent", agencyId, agentId],
    queryFn: () => fetchAgentStats(agencyId, agentId),
    enabled: !!agencyId && !!agentId,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="My dashboard" description="Your day at a glance" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data.stats ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="My dashboard"
        description="Your leads, tasks, and appointments"
        actions={
          <>
            <Link href="/leads"><Button>View leads</Button></Link>
            <Link href="/tasks"><Button variant="outline">View tasks</Button></Link>
          </>
        }
      />
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">At a glance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="My leads" value={stats.myLeads ?? 0} icon={<Users />} variant="primary" />
          <StatCard title="Tasks today" value={stats.tasksToday ?? 0} icon={<CheckSquare />} variant="teal" />
          <StatCard title="Due follow-ups" value={stats.followUpsDue ?? 0} icon={<Clock />} variant="violet" />
          <StatCard title="Appointments today" value={stats.appointmentsToday ?? 0} icon={<Calendar />} variant="amber" />
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insights</h2>
        <NeedsAttentionCard agencyId={agencyId} agentId={agentId} title="Follow-up today" />
      </section>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/leads"><Button variant="outline" size="sm">Add lead</Button></Link>
              <Link href="/tasks"><Button variant="outline" size="sm">My tasks</Button></Link>
              <Link href="/calendar"><Button variant="outline" size="sm">Calendar</Button></Link>
              <Link href="/pipeline"><Button variant="outline" size="sm">Pipeline</Button></Link>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Contact new leads within 5 minutes for best conversion. Use the pipeline to move leads through stages.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
