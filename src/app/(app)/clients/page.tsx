"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ClientFormSheet } from "@/components/clients/client-form-sheet";
import { Search, UserCircle, Plus } from "lucide-react";

async function fetchClients(params: { page?: number; search?: string }) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.search) sp.set("search", params.search);
  const res = await fetch(`/api/clients?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
}

export default function ClientsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["clients", page, searchDebounced],
    queryFn: () => fetchClients({ page, search: searchDebounced || undefined }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchDebounced(search);
    setPage(1);
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage clients and policies"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add client
          </Button>
        }
      />
      <ClientFormSheet open={formOpen} onOpenChange={setFormOpen} />
      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<UserCircle />}
                title="No clients found"
                description="Click 'Add client' or convert leads from the lead detail page."
                action={{ label: "Add client", onClick: () => setFormOpen(true) }}
              />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((client: { id: string; firstName: string; lastName: string; phone: string; email: string | null; carrier: string | null }) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Link href={`/clients/${client.id}`} className="font-medium text-primary hover:underline">
                            {client.firstName} {client.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{client.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{client.carrier ?? "—"}</TableCell>
                        <TableCell>
                          <Link href={`/clients/${client.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {(totalPages > 1 || total > 0) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
