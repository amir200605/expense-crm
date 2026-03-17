"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ChargebackItem {
  id: string;
  amount: string | number;
  reason: string | null;
  date: string;
  recovered: boolean;
  policy: {
    id: string;
    policyNumber: string | null;
    clientId: string;
    client: { id: string; firstName: string; lastName: string };
  };
}

async function fetchChargebacks() {
  const res = await fetch("/api/chargebacks");
  if (!res.ok) throw new Error("Failed to fetch chargebacks");
  return res.json() as Promise<{ items: ChargebackItem[] }>;
}

export default function ChargebacksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["chargebacks"],
    queryFn: fetchChargebacks,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Chargebacks" description="Track and recover chargebacks" />
      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<AlertTriangle />}
                title="No chargebacks"
                description="Chargebacks will appear here if any policies are charged back."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recovered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((cb) => (
                    <TableRow key={cb.id}>
                      <TableCell className="font-mono text-sm">
                        {cb.policy.policyNumber ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {cb.policy.client.firstName} {cb.policy.client.lastName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(cb.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cb.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(cb.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cb.recovered ? "success" : "destructive"}>
                          {cb.recovered ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
