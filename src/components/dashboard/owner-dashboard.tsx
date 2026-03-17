"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, Calendar, FileCheck, DollarSign, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

async function fetchDashboardStats(agencyId: string) {
  const res = await fetch(`/api/dashboard/stats?agencyId=${agencyId}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function OwnerDashboard({ agencyId }: { agencyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", agencyId],
    queryFn: () => fetchDashboardStats(agencyId),
    enabled: !!agencyId,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Agency overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data.stats ?? {};
  const chartData = [
    { name: "Leads", count: stats.totalLeads ?? 0 },
    { name: "This week", count: stats.leadsThisWeek ?? 0 },
    { name: "Appointments", count: stats.appointmentsSet ?? 0 },
    { name: "Placed", count: stats.policiesPlaced ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Agency performance overview" />
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">At a glance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total leads" value={stats.totalLeads ?? 0} icon={<Users />} variant="primary" />
          <StatCard title="New this week" value={stats.leadsThisWeek ?? 0} icon={<TrendingUp />} variant="teal" />
          <StatCard title="Appointments" value={stats.appointmentsSet ?? 0} icon={<Calendar />} variant="amber" />
          <StatCard title="Policies placed" value={stats.policiesPlaced ?? 0} icon={<FileCheck />} variant="teal" />
          <StatCard title="Expected commission" value={formatCurrency(stats.expectedCommission ?? 0)} icon={<DollarSign />} variant="primary" />
          <StatCard title="Chargebacks" value={formatCurrency(stats.chargebacks ?? 0)} icon={<AlertCircle />} variant="rose" />
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insights</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NeedsAttentionCard agencyId={agencyId} title="Leads needing attention" />
          </div>
          <div className="lg:col-span-2">
            <Card className="card-elevated overflow-hidden">
              <CardHeader>
                <CardTitle>Pipeline snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ borderRadius: "var(--radius)" }} />
                      <Bar dataKey="count" fill="hsl(var(--insight))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
