"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";

type Member = { id: string; name: string | null; email: string; role: string; username: string | null };

type ChatRow = {
  id: string;
  updatedAt: string;
  userA: { id: string; name: string | null; email: string; role: string };
  userB: { id: string; name: string | null; email: string; role: string };
  messages: { id: string; body: string; createdAt: string; senderId: string }[];
};

async function fetchTeam(): Promise<{ members: Member[] }> {
  const res = await fetch("/api/team");
  if (!res.ok) return { members: [] };
  return res.json();
}

async function fetchChats(): Promise<{ chats: ChatRow[] }> {
  const res = await fetch("/api/employee-chats");
  if (!res.ok) throw new Error("Failed to load chats");
  return res.json();
}

export default function MessagesPage() {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [search, setSearch] = useState("");

  const { data: team } = useQuery({ queryKey: ["team"], queryFn: fetchTeam, staleTime: 60_000 });
  const { data, isLoading } = useQuery({ queryKey: ["employee-chats"], queryFn: fetchChats });

  const createChat = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employee-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId, firstMessage: firstMessage.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to create chat");
      return json as { chat: { id: string } };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employee-chats"] });
      setNewOpen(false);
      setOtherUserId("");
      setFirstMessage("");
    },
  });

  const chats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.chats ?? [];
    if (!q) return all;
    return all.filter((c) => {
      const a = (c.userA?.name || c.userA?.email || "").toLowerCase();
      const b = (c.userB?.name || c.userB?.email || "").toLowerCase();
      const last = c.messages?.[0]?.body?.toLowerCase() ?? "";
      return a.includes(q) || b.includes(q) || last.includes(q);
    });
  }, [data?.chats, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Chat with your team members inside the CRM."
        actions={(
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            New message
          </Button>
        )}
      />

      <Card className="p-4 border-border/80 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <Label className="sr-only" htmlFor="search">Search</Label>
            <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." />
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {isLoading && (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        )}
        {!isLoading && chats.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground border-border/80 shadow-soft">
            No conversations yet. Click “New message” to start one.
          </Card>
        )}
        {chats.map((c) => {
          const last = c.messages?.[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`}>
              <Card className="p-4 border-border/80 shadow-soft hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {c.userA?.name ?? c.userA?.email} &nbsp;·&nbsp; {c.userB?.name ?? c.userB?.email}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {last ? last.body : "No messages yet"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(c.updatedAt)}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New message</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Send to</Label>
              <Select value={otherUserId} onValueChange={setOtherUserId}>
                <SelectTrigger><SelectValue placeholder="Choose a team member" /></SelectTrigger>
                <SelectContent>
                  {(team?.members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstMessage">Message (optional)</Label>
              <Input
                id="firstMessage"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Write a message to start the conversation..."
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button
              disabled={!otherUserId || createChat.isPending}
              onClick={() => createChat.mutate()}
            >
              {createChat.isPending ? "Creating..." : "Start chat"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

