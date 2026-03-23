import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";

const CARD_W = 600;
const CARD_H = 280;
/** Matches invite preview / brand teal */
const HEADER_FILL = "#14b8a6";
const BODY_FILL = "#fafafa";
const TEXT_MUTED = "#64748b";
const TEXT_NAME = "#0f766e";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPhoneDisplay(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "pending";
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw;
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").toUpperCase();
}

async function loadAvatarDataUri(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl?.startsWith("/uploads/")) return null;
  const safe = avatarUrl.replace(/^\//, "");
  if (safe.includes("..") || safe.includes("\\")) return null;
  const full = path.join(process.cwd(), "public", safe);
  try {
    const buf = await readFile(full);
    const lower = safe.toLowerCase();
    const mime = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function initialLetter(name: string, username: string | null | undefined): string {
  const n = name.trim();
  const u = (username ?? "").trim();
  const ch = (n.charAt(0) || u.charAt(0) || "A").toUpperCase();
  return ch;
}

/**
 * Raster PNG matching the “Invite team member” card preview (header + avatar + fields).
 */
export async function buildAgentCardPngBuffer(opts: {
  agencyName: string;
  name: string;
  username: string | null;
  role: string;
  npnNumber: string | null;
  phone: string | null;
  avatarUrl: string | null;
}): Promise<Buffer> {
  const headerText = escapeXml(opts.agencyName.trim() || "Prime Insurance Agency").toUpperCase();
  const displayName = escapeXml((opts.name.trim() || "TEAM MEMBER").toUpperCase());
  const displayUser = escapeXml((opts.username ?? "").trim() || "pending");
  const displayNpn = escapeXml((opts.npnNumber ?? "").trim() || "pending");
  const displayPhone = escapeXml(formatPhoneDisplay(opts.phone));
  const role = escapeXml(roleLabel(opts.role));

  const avatarData = await loadAvatarDataUri(opts.avatarUrl);
  const letter = initialLetter(opts.name, opts.username);

  const cx = 92;
  const cy = 156;
  const r = 48;

  const avatarBlock = avatarData
    ? `
  <defs>
    <clipPath id="avclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f0fdfa" stroke="#99f6e4" stroke-width="2"/>
  <image href="${avatarData}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#avclip)" preserveAspectRatio="xMidYMid slice"/>
`
    : `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f0fdfa" stroke="#99f6e4" stroke-width="2"/>
  <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="${TEXT_NAME}">${escapeXml(letter)}</text>
`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CARD_W}" height="52" fill="${HEADER_FILL}"/>
  <text x="${CARD_W / 2}" y="33" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600" letter-spacing="0.22em" fill="#ffffff">${headerText}</text>
  <rect x="0" y="52" width="${CARD_W}" height="${CARD_H - 52}" fill="${BODY_FILL}" stroke="#e2e8f0" stroke-width="1"/>
  ${avatarBlock}
  <text x="176" y="118" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${TEXT_NAME}" letter-spacing="0.04em">${displayName}</text>
  <text x="176" y="142" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600" fill="${TEXT_MUTED}" letter-spacing="0.08em">${role}</text>
  <text x="176" y="168" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${TEXT_MUTED}">Username: ${displayUser}</text>
  <text x="176" y="192" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${TEXT_MUTED}">NPN: ${displayNpn}</text>
  <text x="176" y="216" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${TEXT_MUTED}">Phone: ${displayPhone}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Writes PNG under `public/uploads/agent-cards/generated/` and returns absolute public URL for MMS.
 */
export async function writeAgentCardToPublicUrl(params: {
  userId: string;
  agencyName: string;
  name: string;
  username: string | null;
  role: string;
  npnNumber: string | null;
  phone: string | null;
  avatarUrl: string | null;
  appBaseUrl: string;
}): Promise<string | null> {
  const base = params.appBaseUrl.replace(/\/$/, "");
  if (!base.startsWith("http")) return null;

  const buf = await buildAgentCardPngBuffer({
    agencyName: params.agencyName,
    name: params.name,
    username: params.username,
    role: params.role,
    npnNumber: params.npnNumber,
    phone: params.phone,
    avatarUrl: params.avatarUrl,
  });

  const dir = path.join(process.cwd(), "public", "uploads", "agent-cards", "generated");
  await mkdir(dir, { recursive: true });
  const filename = `${params.userId}-${Date.now()}.png`;
  await writeFile(path.join(dir, filename), buf);

  return `${base}/uploads/agent-cards/generated/${filename}`;
}
