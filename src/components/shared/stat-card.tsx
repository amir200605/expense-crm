import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const iconVariants = {
  primary: "bg-primary/12 text-primary [&_svg]:text-primary",
  teal: "bg-emerald-500/12 text-emerald-600 [&_svg]:text-emerald-600",
  amber: "bg-amber-500/12 text-amber-600 [&_svg]:text-amber-600",
  violet: "bg-violet-500/12 text-violet-600 [&_svg]:text-violet-600",
  rose: "bg-rose-500/12 text-rose-600 [&_svg]:text-rose-600",
} as const;

type IconVariant = keyof typeof iconVariants;

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: { value: string; up: boolean };
  variant?: IconVariant;
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, variant = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", iconVariants[variant])}>
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {description && <span>{description}</span>}
            {trend && (
              <span className={trend.up ? "text-emerald-600" : "text-amber-600"}>
                {trend.value}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
