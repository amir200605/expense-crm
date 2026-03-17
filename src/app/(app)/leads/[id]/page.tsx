import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewLead } from "@/lib/permissions";
import { getLeadById } from "@/lib/services/lead.service";
import { serializeLeadForClient } from "@/lib/utils";
import { LeadDetailClient } from "@/components/leads/lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  if (!canViewLead(session, lead)) notFound();
  const serialized = serializeLeadForClient(lead as unknown as Record<string, unknown>);
  return <LeadDetailClient leadId={id} initialLead={serialized} />;
}
