import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Access denied. Super Admin only.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle>Platform admin</CardTitle>
          <CardDescription>Manage agencies, billing, platform settings. Audit log link when implemented.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Audit log and agency list coming in Phase 4.</p>
        </CardContent>
      </Card>
    </div>
  );
}
