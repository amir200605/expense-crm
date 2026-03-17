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
import { DollarSign } from "lucide-react";

interface CommissionItem {
  id: string;
  carrier: string | null;
  product: string | null;
  amount: string | number;
  expectedDate: string | null;
  status: string;
  agent: { id: string; name: string | null };
  client: { id: string; firstName: string; lastName: string };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  PENDING: "secondary",
  EXPECTED: "warning",
  RECEIVED: "success",
  CHARGEBACK: "destructive",
  ADJUSTED: "outline",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchCommissions() {
  const res = await fetch("/api/commissions");
  if (!res.ok) throw new Error("Failed to fetch commissions");
  return res.json() as Promise<{ items: CommissionItem[] }>;
}

export default function CommissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: fetchCommissions,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Expected and received commissions" />
      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<DollarSign />}
                title="No commissions yet"
                description="Commissions will appear here once policies are placed."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {commission.agent.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {commission.client.firstName} {commission.client.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {commission.carrier ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {commission.product ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {commission.expectedDate ? formatDate(commission.expectedDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[commission.status] ?? "outline"}>
                          {statusLabel(commission.status)}
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
