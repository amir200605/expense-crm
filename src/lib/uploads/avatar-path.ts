import path from "path";

/** Safe join for `public/uploads/avatars/<filename>` only. */
export function safeAvatarFilePathFromPublicUrl(urlPath: string): string | null {
  if (!urlPath.startsWith("/uploads/avatars/")) return null;
  const name = urlPath.slice("/uploads/avatars/".length);
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
  return path.join(process.cwd(), "public", "uploads", "avatars", name);
}
