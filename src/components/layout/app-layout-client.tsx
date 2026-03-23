"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
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
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-content">
      <Sidebar user={user} onOpenMessages={() => setMessagesOpen(true)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Navbar user={user} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-content p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {children}
          </div>
        </main>
      </div>
      <MessagesPopup open={messagesOpen} onOpenChange={setMessagesOpen} showFloatingTrigger={false} />
    </div>
  );
}
