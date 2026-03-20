/** Safe for Prisma DateTime — never pass Invalid Date. */
export function parseOptionalDateString(value: string | undefined | null): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Optional FK / id fields from JSON may not be strings — never call .trim() blindly. */
export function optionalStringId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}
