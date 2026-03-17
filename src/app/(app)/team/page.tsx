"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { InviteMemberSheet } from "@/components/team/invite-member-sheet";
import { UserPlus, Pencil, Trash2 } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  username: string | null;
}

async function fetchTeam(): Promise<{ members: Member[] }> {
  const res = await fetch("/api/team");
  if (!res.ok) throw new Error("Failed to load team");
  return res.json();
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  const members = data?.members ?? [];

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; username: string; role: string }) => {
      const res = await fetch(`/api/team/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, username: payload.username, role: payload.role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setSaveMsg("Saved");
      setTimeout(() => { setSaveMsg(""); setEditOpen(false); }, 1000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });

  function openEdit(m: Member) {
    setEditMember(m);
    setEditName(m.name ?? "");
    setEditUsername(m.username ?? "");
    setEditRole(m.role);
    setSaveMsg("");
    setEditOpen(true);
  }

  function handleDelete(m: Member) {
    if (!confirm(`Remove ${m.name ?? m.username ?? "this user"} from the team? This cannot be undone.`)) return;
    deleteMutation.mutate(m.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage agents and managers"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        }
      />

      {isError && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}

      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No team members yet. Invite someone to get started.
            </p>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.username ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{m.role.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(m)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMemberSheet open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Edit Member Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit member</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="AGENCY_OWNER">Agency Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}
            {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editMember && updateMutation.mutate({ id: editMember.id, name: editName, username: editUsername, role: editRole })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
