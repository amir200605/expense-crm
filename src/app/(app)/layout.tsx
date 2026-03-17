import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import type { SessionUser } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user as SessionUser;

  return (
    <div className="flex h-screen overflow-hidden bg-content">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar user={user} />
        <main className="flex-1 overflow-auto bg-content p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {children}
          </div>
        </main>
      </div>
      <AiChatPanel />
    </div>
  );
}
