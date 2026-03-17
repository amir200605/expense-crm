"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  clients: "Clients",
  pipeline: "Pipeline",
  tasks: "Tasks",
  calendar: "Calendar",
  policies: "Policies",
  commissions: "Commissions",
  chargebacks: "Chargebacks",
  communications: "Communications",
  automations: "Automations",
  reports: "Reports",
  team: "Team",
  settings: "Settings",
  admin: "Admin",
};

function getLabel(segment: string, isLast: boolean): string {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (isLast && /^[a-z0-9-]+$/i.test(segment)) return "Detail";
  return segment;
}

type AppBreadcrumbsProps = { variant?: "light" | "dark" };

export function AppBreadcrumbs({ variant = "light" }: AppBreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const isDark = variant === "dark";
  const textClass = isDark ? "text-sidebar-muted" : "text-muted-foreground";
  const linkHoverClass = isDark ? "hover:text-sidebar-foreground" : "hover:text-foreground";
  const chevronClass = isDark ? "text-sidebar-muted/70" : "text-border";

  return (
    <nav className={cn("flex items-center gap-2 text-sm", textClass)}>
      {segments.map((segment, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = getLabel(segment, isLast);
        return (
          <span key={href} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className={cn("h-4 w-4 shrink-0", chevronClass)} />}
            {isLast ? (
              <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground truncate max-w-[160px] sm:max-w-[240px]" title={segment}>
                {label}
              </span>
            ) : (
              <Link href={href} className={cn(linkHoverClass, "truncate max-w-[120px] sm:max-w-[180px] transition-colors")} title={segment}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
