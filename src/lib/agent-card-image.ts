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

const EMPTY_DASH = "\u2014";

function formatPhoneDisplay(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return EMPTY_DASH;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw;
}

/** Scale font size so a line of text roughly fits the available width (Arial-like metrics). */
function fontSizeForLine(charCount: number, maxWidthPx: number, maxPx: number, minPx: number): number {
  const n = Math.max(charCount, 1);
  const ideal = maxWidthPx / (n * 0.52);
  return Math.round(Math.max(minPx, Math.min(maxPx, ideal)));
}

function headerFontSize(headerLen: number, maxWidthPx: number): number {
  const n = Math.max(headerLen, 1);
  const ideal = maxWidthPx / (n * 0.55);
  return Math.round(Math.max(9, Math.min(15, ideal)));
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
  // Product requirement: keep card title consistent across all previews/messages.
  const headerText = "PRIME INSURANCE AGENCY";
  const nameRaw = (opts.name.trim() || "TEAM MEMBER").toUpperCase();
  const displayName = escapeXml(nameRaw);
  const npnTrim = (opts.npnNumber ?? "").trim();
  const displayNpn = escapeXml(npnTrim || EMPTY_DASH);
  const displayPhone = escapeXml(formatPhoneDisplay(opts.phone));
  const role = escapeXml(roleLabel(opts.role));

  const textLeft = 176;
  const textWidth = CARD_W - textLeft - 24;
  const headerFs = headerFontSize(headerText.length, CARD_W - 40);
  const nameFs = fontSizeForLine(nameRaw.length, textWidth, 36, 20);
  const roleFs = Math.round(Math.min(16, Math.max(11, nameFs * 0.42)));
  const detailFs = Math.round(Math.min(18, Math.max(13, nameFs * 0.48)));

  const yName = 118;
  const yRole = yName + Math.round(nameFs * 0.95) + 6;
  const yNpn = yRole + Math.round(roleFs * 1.1) + 10;
  const yPhone = yNpn + Math.round(detailFs * 1.2) + 8;

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
  <text x="${CARD_W / 2}" y="33" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${headerFs}" font-weight="600" letter-spacing="0.14em" fill="#ffffff">${headerText}</text>
  <rect x="0" y="52" width="${CARD_W}" height="${CARD_H - 52}" fill="${BODY_FILL}" stroke="#e2e8f0" stroke-width="1"/>
  ${avatarBlock}
  <text x="${textLeft}" y="${yName}" font-family="Arial, Helvetica, sans-serif" font-size="${nameFs}" font-weight="700" fill="${TEXT_NAME}" letter-spacing="0.03em">${displayName}</text>
  <text x="${textLeft}" y="${yRole}" font-family="Arial, Helvetica, sans-serif" font-size="${roleFs}" font-weight="600" fill="${TEXT_MUTED}" letter-spacing="0.05em">${role}</text>
  <text x="${textLeft}" y="${yNpn}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFs}" fill="${TEXT_MUTED}">NPN: ${displayNpn}</text>
  <text x="${textLeft}" y="${yPhone}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFs}" fill="${TEXT_MUTED}">Phone: ${displayPhone}</text>
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
