"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { MessagesPopup } from "@/components/messages/messages-popup";
import type { SessionUser } from "@/lib/permissions";

export function AppLayoutClient({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [messagesOpen, setMessagesOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-content">
      <Sidebar user={user} onOpenMessages={() => setMessagesOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar user={user} />
        <main className="flex-1 overflow-auto bg-content p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {children}
          </div>
        </main>
      </div>
      <AiChatPanel />
      <MessagesPopup open={messagesOpen} onOpenChange={setMessagesOpen} />
    </div>
  );
}
