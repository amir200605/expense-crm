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
import { FileText } from "lucide-react";

interface PolicyItem {
  id: string;
  policyNumber: string | null;
  carrier: string | null;
  productName: string | null;
  faceAmount: string | number | null;
  premium: string | number | null;
  policyStatus: string;
  effectiveDate: string | null;
  client: { id: string; firstName: string; lastName: string };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SUBMITTED: "outline",
  PENDING_UNDERWRITING: "warning",
  APPROVED: "success",
  PLACED: "success",
  DECLINED: "destructive",
  CANCELLED: "destructive",
  LAPSED: "destructive",
  CHARGEBACK: "destructive",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchPolicies() {
  const res = await fetch("/api/policies");
  if (!res.ok) throw new Error("Failed to fetch policies");
  return res.json() as Promise<{ items: PolicyItem[] }>;
}

export default function PoliciesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Policies" description="All policies across your agency" />
      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<FileText />}
                title="No policies yet"
                description="Policies will appear here once created from a client record."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Face Amount</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-mono text-sm">
                        {policy.policyNumber ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {policy.client.firstName} {policy.client.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.carrier ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.productName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {policy.faceAmount != null ? formatCurrency(policy.faceAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {policy.premium != null ? formatCurrency(policy.premium) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[policy.policyStatus] ?? "outline"}>
                          {statusLabel(policy.policyStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.effectiveDate ? formatDate(policy.effectiveDate) : "—"}
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
