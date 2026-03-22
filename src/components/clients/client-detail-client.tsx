"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CLIENT_DETAIL_STALE_MS, fetchClientById } from "@/lib/queries/clients";

export function ClientDetailClient({
  clientId,
  initialClient,
}: {
  clientId: string;
  initialClient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    beneficiaryName: string | null;
    carrier: string | null;
    productName: string | null;
    faceAmount: unknown;
    premiumAmount: unknown;
    policyStatus: string | null;
    chargebackRisk: boolean;
    notes: string | null;
    linkedLeadId: string | null;
    policies: unknown[];
  };
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [keepPoliciesMounted, setKeepPoliciesMounted] = useState(false);

  useEffect(() => {
    if (activeTab === "policies") setKeepPoliciesMounted(true);
  }, [activeTab]);

  const onTabChange = useCallback((value: string) => {
    startTransition(() => setActiveTab(value));
  }, []);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClientById(clientId),
    initialData: initialClient,
    initialDataUpdatedAt: Date.now(),
    staleTime: CLIENT_DETAIL_STALE_MS,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete client");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      router.push("/clients");
      router.refresh();
    },
  });

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canDeleteClient =
    Boolean(role) &&
    role !== "QA_COMPLIANCE" &&
    ["SUPER_ADMIN", "AGENCY_OWNER", "MANAGER", "AGENT"].includes(role ?? "");

  if (isLoading && !client) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  const name = client ? `${client.firstName} ${client.lastName}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {client?.policyStatus && (
                <Badge variant="secondary" className="font-normal">{client.policyStatus}</Badge>
              )}
              {client?.chargebackRisk && <Badge variant="destructive">Chargeback risk</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {client?.linkedLeadId && (
            <Button variant="outline" asChild>
              <Link href={`/leads/${client.linkedLeadId}`}>View linked lead</Link>
            </Button>
          )}
          {canDeleteClient && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this client?</DialogTitle>
            <DialogDescription>
              This removes {name || "this client"} and related policies, commissions, and messages for this record.
              The original lead (if any) will remain. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" forceMount className="space-y-4">
          <Card className="border-border/80 shadow-soft">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</p><p className="text-sm">{[client?.city, client?.state, client?.zip].filter(Boolean).join(", ") || "—"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Beneficiary</p><p className="text-sm">{client?.beneficiaryName ?? "—"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Carrier</p><p className="text-sm">{client?.carrier ?? "—"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Product</p><p className="text-sm">{client?.productName ?? "—"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Face amount</p><p className="text-sm">{client?.faceAmount != null ? formatCurrency(Number(client.faceAmount)) : "—"}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Premium</p><p className="text-sm">{client?.premiumAmount != null ? formatCurrency(Number(client.premiumAmount)) : "—"}</p></div>
              {client?.notes && <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{client.notes}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="policies" {...(keepPoliciesMounted ? { forceMount: true as const } : {})}>
          <Card className="border-border/80 shadow-soft">
            <CardHeader><CardTitle>Policies</CardTitle><CardDescription>Policy list</CardDescription></CardHeader>
            <CardContent>
              {Array.isArray(client?.policies) && client.policies.length > 0 ? (
                <ul className="space-y-2">
                  {(client.policies as { policyNumber: string | null; carrier: string | null; policyStatus: string }[]).map((p: { policyNumber: string | null; carrier: string | null; policyStatus: string }, i: number) => (
                    <li key={i} className="text-sm">{p.policyNumber ?? "—"} · {p.carrier ?? "—"} · {p.policyStatus}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No policies yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card className="border-border/80 shadow-soft">
            <CardHeader><CardTitle>Activity</CardTitle><CardDescription>Notes and history</CardDescription></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">No activity yet.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
