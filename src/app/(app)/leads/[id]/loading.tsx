import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the server loads lead detail — avoids a blank screen on slow navigations. */
export default function LeadDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
