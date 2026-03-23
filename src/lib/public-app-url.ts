/**
 * Base URL used for absolute links that external services must fetch (e.g. Telnyx MMS `media_urls`).
 * `new URL(req.url).origin` is often `http://localhost:...`, which Telnyx cannot reach — set PUBLIC_APP_URL.
 */
function stripTrailingSlash(u: string): string {
  return u.replace(/\/$/, "");
}

function normalizeHttpUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return stripTrailingSlash(t);
  return stripTrailingSlash(`https://${t}`);
}

/**
 * Prefer explicit env (production / tunnel) over the request origin.
 */
export function resolvePublicAppBaseUrl(reqOrigin: string | null | undefined): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return normalizeHttpUrl(explicit);

  const o = reqOrigin?.trim();
  if (o) return stripTrailingSlash(o);

  return "http://localhost:3000";
}

/**
 * Best public origin for the current HTTP request (reverse-proxy safe).
 */
export function getPublicBaseUrlFromRequest(req: Request): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return normalizeHttpUrl(explicit);

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) {
    const p = proto === "http" || proto === "https" ? proto : url.protocol.replace(":", "") || "https";
    return stripTrailingSlash(`${p}://${host}`);
  }

  return stripTrailingSlash(url.origin);
}
