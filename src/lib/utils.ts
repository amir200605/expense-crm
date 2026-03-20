import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * Explicit IANA timezone so server and browser render the same string (avoids hydration mismatch).
 * Override with `NEXT_PUBLIC_APP_TIMEZONE` (e.g. `America/Los_Angeles`).
 */
export function getAppDisplayTimeZone(): string {
  const z = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim();
  return z || "America/New_York";
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: getAppDisplayTimeZone(),
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: getAppDisplayTimeZone(),
  }).format(new Date(date));
}

const DATE_KEYS = ["dateOfBirth", "lastContactedAt", "nextFollowUpAt", "createdAt", "updatedAt"];
const DECIMAL_KEYS = ["coverageAmountInterest", "leadCost"];

/** Serialize a lead (with Prisma Decimal/Date) for passing to client components. */
export function serializeLeadForClient<T extends Record<string, unknown>>(lead: T): T {
  const obj = { ...lead } as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v === null || v === undefined) continue;
    if (DATE_KEYS.includes(key) && v instanceof Date) {
      obj[key] = v.toISOString();
    } else if (DECIMAL_KEYS.includes(key) && typeof v === "object" && v !== null && "toString" in v) {
      const n = parseFloat((v as { toString: () => string }).toString());
      obj[key] = Number.isNaN(n) ? null : n;
    } else if (key === "tags" && Array.isArray(v)) {
      obj[key] = v.map((item: unknown) =>
        typeof item === "object" && item !== null && "tag" in item
          ? { ...(item as Record<string, unknown>), tag: (item as Record<string, unknown>).tag }
          : item
      );
    }
  }
  return obj as T;
}
