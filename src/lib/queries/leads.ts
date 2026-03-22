import type { QueryClient } from "@tanstack/react-query";

/** How long lead detail is considered fresh (reduces duplicate GET /api/leads/:id). */
export const LEAD_DETAIL_STALE_MS = 120_000;
export const TEAM_STALE_MS = 5 * 60_000;

export async function fetchLeadById(id: string) {
  const res = await fetch(`/api/leads/${id}`);
  if (!res.ok) throw new Error("Failed to fetch lead");
  return res.json();
}

export async function fetchLeadSms(leadId: string) {
  const res = await fetch(`/api/leads/${leadId}/sms`);
  if (!res.ok) throw new Error("Failed to load SMS history");
  return res.json();
}

/** Call from list/pipeline hover so lead detail often hits cache instantly. */
export function prefetchLeadDetail(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLeadById(id),
    staleTime: LEAD_DETAIL_STALE_MS,
  });
}
