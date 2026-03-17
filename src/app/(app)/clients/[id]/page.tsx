import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewClient } from "@/lib/permissions";
import { getClientById } from "@/lib/services/client.service";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  if (!canViewClient(session, client)) notFound();
  return <ClientDetailClient clientId={id} initialClient={JSON.parse(JSON.stringify(client))} />;
}
