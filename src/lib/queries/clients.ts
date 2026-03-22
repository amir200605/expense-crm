import type { QueryClient } from "@tanstack/react-query";

export const CLIENT_DETAIL_STALE_MS = 120_000;

export async function fetchClientById(id: string) {
  const res = await fetch(`/api/clients/${id}`);
  if (!res.ok) throw new Error("Failed to fetch client");
  return res.json();
}

/** Hover prefetch from /clients list so detail opens with cache warm. */
export function prefetchClientDetail(queryClient: QueryClient, id: string) {
  return queryClient.prefetchQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClientById(id),
    staleTime: CLIENT_DETAIL_STALE_MS,
  });
}
