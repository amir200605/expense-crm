import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppLayoutClient } from "@/components/layout/app-layout-client";
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

  return <AppLayoutClient user={user}>{children}</AppLayoutClient>;
}
