"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, Download } from "lucide-react";

const REPORT_TYPES = [
  { id: "lead-source", name: "Lead source performance", description: "Leads by source and conversion" },
  { id: "agent-activity", name: "Agent activity", description: "Calls, tasks, and follow-ups by agent" },
  { id: "sales-conversion", name: "Sales conversion", description: "Pipeline and close rates" },
  { id: "commissions", name: "Commissions", description: "Expected vs received by agent" },
  { id: "chargebacks", name: "Chargebacks", description: "Chargeback summary and recovery" },
];

async function fetchDashboardForReport() {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("lead-source");
  const { data } = useQuery({
    queryKey: ["dashboard-stats-report"],
    queryFn: fetchDashboardForReport,
  });

  const stats = data?.stats ?? {};
  const chartData = [
    { name: "Total leads", value: stats.totalLeads ?? 0 },
    { name: "This week", value: stats.leadsThisWeek ?? 0 },
    { name: "Appointments", value: stats.appointmentsSet ?? 0 },
    { name: "Placed", value: stats.policiesPlaced ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Exportable reports for lead source, activity, sales, and commissions"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {REPORT_TYPES.map((r) => (
          <Card
            key={r.id}
            className={`border-border/80 shadow-soft cursor-pointer transition-colors ${reportType === r.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setReportType(r.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{r.name}</CardTitle>
              <CardDescription className="text-xs">{r.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="border-border/80 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {REPORT_TYPES.find((r) => r.id === reportType)?.name ?? "Report"}
            </CardTitle>
            <CardDescription>Summary view · CSV export available when report API is connected</CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" width={72} className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: "var(--radius)" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
