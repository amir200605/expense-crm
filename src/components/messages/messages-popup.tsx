"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageSquarePlus, Send } from "lucide-react";

type Member = { id: string; name: string | null; email: string; role: string; username: string | null };

type ChatRow = {
  id: string;
  updatedAt: string;
  userA: { id: string; name: string | null; email: string; role: string };
  userB: { id: string; name: string | null; email: string; role: string };
  messages: { id: string; body: string; createdAt: string; senderId: string }[];
};

type Chat = {
  id: string;
  userA: { id: string; name: string | null; email: string };
  userB: { id: string; name: string | null; email: string };
  messages: {
    id: string;
    body: string;
    createdAt: string;
    sender: { id: string; name: string | null; email: string };
  }[];
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

async function fetchChat(id: string): Promise<{ chat: Chat }> {
  const res = await fetch(`/api/employee-chats/${id}`);
  if (!res.ok) throw new Error("Failed to load chat");
  return res.json();
}

export function MessagesPopup({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "chat">("list");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");

  const { data: team } = useQuery({ queryKey: ["team"], queryFn: fetchTeam, staleTime: 60_000 });
  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ["employee-chats"],
    queryFn: fetchChats,
    enabled: open,
  });
  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["employee-chat", selectedChatId],
    queryFn: () => fetchChat(selectedChatId!),
    enabled: open && view === "chat" && !!selectedChatId,
    refetchInterval: 10_000,
  });

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
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["employee-chats"] });
      setNewOpen(false);
      setOtherUserId("");
      setFirstMessage("");
      setSelectedChatId(data.chat.id);
      setView("chat");
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/employee-chats/${selectedChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      return json;
    },
    onSuccess: async () => {
      setBody("");
      await qc.invalidateQueries({ queryKey: ["employee-chat", selectedChatId] });
      await qc.invalidateQueries({ queryKey: ["employee-chats"] });
    },
  });

  const chats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = chatsData?.chats ?? [];
    if (!q) return all;
    return all.filter((c) => {
      const a = (c.userA?.name || c.userA?.email || "").toLowerCase();
      const b = (c.userB?.name || c.userB?.email || "").toLowerCase();
      const last = c.messages?.[0]?.body?.toLowerCase() ?? "";
      return a.includes(q) || b.includes(q) || last.includes(q);
    });
  }, [chatsData?.chats, search]);

  const chat = chatData?.chat;
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setView("list");
      setSelectedChatId(null);
      setNewOpen(false);
      setSearch("");
      setBody("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        showClose={true}
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="text-base font-semibold">
            {view === "list" ? "Messages" : (chat ? `${chat.userA.name ?? chat.userA.email} · ${chat.userB.name ?? chat.userB.email}` : "Conversation")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {view === "list" && (
            <>
              <div className="shrink-0 p-4 space-y-3 border-b">
                <div className="flex gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5 shrink-0">
                    <MessageSquarePlus className="h-4 w-4" />
                    New
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chatsLoading && (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                )}
                {!chatsLoading && chats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No conversations yet. Click &quot;New&quot; to start one.
                  </p>
                )}
                {!chatsLoading &&
                  chats.map((c) => {
                    const last = c.messages?.[0];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedChatId(c.id);
                          setView("chat");
                        }}
                        className="w-full text-left"
                      >
                        <Card className="p-3 border-border/80 shadow-soft hover:shadow-card transition-shadow">
                          <p className="font-medium text-sm truncate">
                            {c.userA?.name ?? c.userA?.email} · {c.userB?.name ?? c.userB?.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {last ? last.body : "No messages yet"}
                          </p>
                        </Card>
                      </button>
                    );
                  })}
              </div>
            </>
          )}

          {view === "chat" && (
            <>
              <div className="shrink-0 px-4 py-2 border-b flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setView("list");
                    setSelectedChatId(null);
                    setBody("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {chatLoading && (
                  <>
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="h-12 w-1/2" />
                  </>
                )}
                {!chatLoading && (chat?.messages?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hi.</p>
                )}
                {!chatLoading &&
                  chat?.messages?.map((m) => (
                    <div key={m.id} className="rounded-xl border border-border/80 bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{m.sender.name ?? m.sender.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
              </div>
              <div className="shrink-0 border-t p-4">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!body.trim()) return;
                    sendMessage.mutate();
                  }}
                >
                  <Input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!body.trim() || sendMessage.isPending} size="sm" className="gap-1.5">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* New message sheet inline in dialog */}
        {newOpen && (
          <div className="absolute inset-0 z-10 bg-background flex flex-col">
            <div className="shrink-0 flex items-center gap-2 border-b px-4 py-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewOpen(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-base">New message</DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select value={otherUserId} onValueChange={setOtherUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
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
                <Label htmlFor="popup-firstMessage">Message (optional)</Label>
                <Input
                  id="popup-firstMessage"
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Write a message..."
                />
              </div>
              <Button
                disabled={!otherUserId || createChat.isPending}
                onClick={() => createChat.mutate()}
              >
                {createChat.isPending ? "Creating…" : "Start chat"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
