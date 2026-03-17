"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send } from "lucide-react";

type Chat = {
  id: string;
  userA: { id: string; name: string | null; email: string };
  userB: { id: string; name: string | null; email: string };
  messages: { id: string; body: string; createdAt: string; sender: { id: string; name: string | null; email: string } }[];
};

async function fetchChat(id: string): Promise<{ chat: Chat }> {
  const res = await fetch(`/api/employee-chats/${id}`);
  if (!res.ok) throw new Error("Failed to load chat");
  return res.json();
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  // Next 15 types may provide params as a Promise in generated PageProps.
  // This is a client component; we normalize to a string id via useMemo.
  const idPromise = params;
  const [id, setId] = useState<string>("");

  useMemo(() => {
    void idPromise.then((p) => setId(p.id)).catch(() => setId(""));
    return null;
  }, [idPromise]);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-chat", id],
    queryFn: () => fetchChat(id),
    refetchInterval: 10_000,
    enabled: Boolean(id),
  });

  const chat = data?.chat;

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/employee-chats/${id}`, {
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
      await qc.invalidateQueries({ queryKey: ["employee-chat", id] });
      await qc.invalidateQueries({ queryKey: ["employee-chats"] });
    },
  });

  const title = useMemo(() => {
    if (!chat) return "Conversation";
    return `${chat.userA.name ?? chat.userA.email} · ${chat.userB.name ?? chat.userB.email}`;
  }, [chat]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        actions={(
          <Button asChild variant="outline" className="gap-2">
            <Link href="/messages">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        )}
      />

      <Card className="border-border/80 shadow-soft">
        <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
          {isLoading && (
            <>
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-3/5" />
            </>
          )}
          {!isLoading && (chat?.messages?.length ?? 0) === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hi.
            </div>
          )}
          {chat?.messages?.map((m) => (
            <div key={m.id} className="rounded-xl border border-border/80 bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {m.sender.name ?? m.sender.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border/80 p-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!body.trim()) return;
              send.mutate();
            }}
          >
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message..."
            />
            <Button type="submit" disabled={!body.trim() || send.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

