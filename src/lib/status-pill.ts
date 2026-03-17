import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Map lead disposition to status pill variant (soft gray, amber, mint). */
export function getDispositionBadgeVariant(disposition: string | null | undefined): BadgeVariant {
  if (!disposition) return "status-new";
  const d = disposition.toUpperCase();
  if (d === "SOLD") return "status-sold";
  if (
    ["INTERESTED", "APPOINTMENT_SET", "PRESENTED", "APPLICATION_SENT", "QUOTED", "FOLLOW_UP_LATER", "RECYCLE"].includes(d)
  )
    return "status-interested";
  return "status-new";
}

/** Map pipeline stage to status pill variant. */
export function getStageBadgeVariant(stage: string | null | undefined): BadgeVariant {
  if (!stage) return "status-new";
  const s = stage.toUpperCase();
  if (s === "PLACED" || s === "APPROVED") return "status-sold";
  if (
    ["QUOTED", "APPOINTMENT_SET", "APPLICATION_STARTED", "UNDERWRITING", "CONTACTING"].includes(s)
  )
    return "status-interested";
  return "status-new";
}
