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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteMemberSheet } from "@/components/team/invite-member-sheet";
import { AvatarCropDialog } from "@/components/team/avatar-crop-dialog";
import { UserPlus, Pencil, Trash2, Camera } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  username: string | null;
  avatarUrl: string | null;
  phone: string | null;
  npnNumber: string | null;
}

function memberInitials(m: Member) {
  const n = m.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase() || n.slice(0, 2).toUpperCase();
  }
  return m.email.slice(0, 2).toUpperCase();
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
  /** Must match a SelectItem value — never "" or Radix warns (uncontrolled/controlled). */
  const [editRole, setEditRole] = useState<"AGENT" | "MANAGER" | "AGENCY_OWNER">("AGENT");
  const [editPhone, setEditPhone] = useState("");
  const [editNpn, setEditNpn] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropMemberId, setCropMemberId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  const members = data?.members ?? [];

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; username: string; role: string; phone: string; npnNumber: string }) => {
      const res = await fetch(`/api/team/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, username: payload.username, role: payload.role, phone: payload.phone || null, npnNumber: payload.npnNumber || null }),
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

  const removeAvatarMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/${id}/avatar`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to remove photo");
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
    const r = m.role;
    setEditRole(
      r === "AGENT" || r === "MANAGER" || r === "AGENCY_OWNER" ? r : "AGENT"
    );
    setEditPhone(m.phone ?? "");
    setEditNpn(m.npnNumber ?? "");
    setSaveMsg("");
    setEditOpen(true);
  }

  function openCropForMember(memberId: string) {
    setCropMemberId(memberId);
    setCropOpen(true);
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
                    <TableHead className="w-[72px]">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.avatarUrl ?? undefined} alt="" />
                            <AvatarFallback className="text-xs">{memberInitials(m)}</AvatarFallback>
                          </Avatar>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            title="Change photo"
                            onClick={() => openCropForMember(m.id)}
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
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

      <AvatarCropDialog
        open={cropOpen}
        onOpenChange={(o) => {
          setCropOpen(o);
          if (!o) setCropMemberId(null);
        }}
        onCropped={async (blob) => {
          if (!cropMemberId) return;
          const fd = new FormData();
          fd.append("file", blob, "avatar.jpg");
          const res = await fetch(`/api/team/${cropMemberId}/avatar`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? "Upload failed");
          }
          await queryClient.invalidateQueries({ queryKey: ["team"] });
        }}
      />

      {/* Edit Member Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit member</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {editMember && (
              <div className="flex items-center gap-4 rounded-lg border border-border/80 p-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={editMember.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{memberInitials(editMember)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditOpen(false);
                      openCropForMember(editMember.id);
                    }}
                  >
                    <Camera className="mr-1.5 h-3.5 w-3.5" />
                    {editMember.avatarUrl ? "Change photo" : "Add photo"}
                  </Button>
                  {editMember.avatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={removeAvatarMutation.isPending}
                      onClick={() => removeAvatarMutation.mutate(editMember.id)}
                    >
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>
            )}
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
              <Select
                value={editRole}
                onValueChange={(v) =>
                  setEditRole(v as "AGENT" | "MANAGER" | "AGENCY_OWNER")
                }
              >
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
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(877) 864-9126" />
            </div>
            <div className="space-y-2">
              <Label>License / NPN</Label>
              <Input value={editNpn} onChange={(e) => setEditNpn(e.target.value)} placeholder="20062397" />
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}
            {removeAvatarMutation.isError && (
              <p className="text-sm text-destructive">{removeAvatarMutation.error.message}</p>
            )}
            {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editMember && updateMutation.mutate({ id: editMember.id, name: editName, username: editUsername, role: editRole, phone: editPhone, npnNumber: editNpn })}
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
