import path from "path";

export function safeCardFilePathFromPublicUrl(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/uploads/agent-cards/")) return null;
  const relative = publicUrl.replace("/uploads/agent-cards/", "");
  if (!relative || relative.includes("..") || relative.includes("/") || relative.includes("\\")) {
    return null;
  }
  return path.join(process.cwd(), "public", "uploads", "agent-cards", relative);
}
