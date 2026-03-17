"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { Users, UserCheck, Calendar, Clock } from "lucide-react";

async function fetchDashboardStats(agencyId: string, managerId: string) {
  const res = await fetch(`/api/dashboard/stats?agencyId=${agencyId}&managerId=${managerId}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function ManagerDashboard({ agencyId, managerId }: { agencyId: string; managerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats-manager", agencyId, managerId],
    queryFn: () => fetchDashboardStats(agencyId, managerId),
    enabled: !!agencyId && !!managerId,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team dashboard" description="Your team at a glance" />
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
      <PageHeader title="Team dashboard" description="Your team performance and activity" />
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">At a glance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Team leads" value={stats.totalLeads ?? 0} icon={<Users />} variant="primary" />
          <StatCard title="Active agents" value={stats.activeAgents ?? 0} icon={<UserCheck />} variant="teal" />
          <StatCard title="Appointments" value={stats.appointmentsSet ?? 0} icon={<Calendar />} variant="amber" />
          <StatCard title="Follow-ups due" value={stats.followUpsDue ?? 0} icon={<Clock />} variant="violet" />
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insights</h2>
        <NeedsAttentionCard agencyId={agencyId} managerId={managerId} title="Leads needing attention" />
      </section>
    </div>
  );
}
