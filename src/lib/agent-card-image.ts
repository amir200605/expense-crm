import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";

const CARD_W = 600;
const CARD_H = 280;
/** Matches invite preview / brand teal */
const HEADER_FILL = "#5f82b3";
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
  const headerTextTop = "PRIME INSURANCE";
  const headerTextBottom = "AGENCY";
  const nameRaw = (opts.name.trim() || "TEAM MEMBER").toUpperCase();
  const displayName = escapeXml(nameRaw);
  const npnTrim = (opts.npnNumber ?? "").trim();
  const displayNpn = escapeXml(npnTrim || EMPTY_DASH);
  const displayPhone = escapeXml(formatPhoneDisplay(opts.phone));
  const licensedSubtitleRaw = "LICENSED LIFE & HEALTH INSURANCE AGENT";
  const licensedSubtitle = escapeXml(licensedSubtitleRaw);

  const textLeft = 176;
  const textWidth = CARD_W - textLeft - 24;
  const headerTopFs = headerFontSize(headerTextTop.length, CARD_W - 220) + 5;
  const headerBottomFs = 18;
  const nameFs = fontSizeForLine(nameRaw.length, textWidth, 36, 20);
  const subtitleFs = Math.round(Math.min(14, Math.max(10, nameFs * 0.34)));
  const detailFs = Math.round(Math.min(18, Math.max(13, nameFs * 0.48)));

  const yName = 118;
  const ySubtitle = yName + Math.round(nameFs * 0.95) + 6;
  const yNpn = ySubtitle + Math.round(subtitleFs * 1.15) + 12;
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
  <rect x="0" y="0" width="${CARD_W}" height="60" fill="${HEADER_FILL}"/>
  <g transform="translate(16,6)">
    <path d="M26 2 C18 8, 10 8, 2 10 V23 C2 35, 11 45, 26 53 C41 45, 50 35, 50 23 V10 C42 8, 34 8, 26 2 Z" fill="#d8e2f1" stroke="#1d3557" stroke-width="2"/>
    <path d="M26 9 C20 13, 14 13, 9 15 V24 C9 32, 15 39, 26 45 C37 39, 43 32, 43 24 V15 C38 13, 32 13, 26 9 Z" fill="#1d3557"/>
    <line x1="26" y1="15" x2="26" y2="38" stroke="#d8e2f1" stroke-width="2"/>
    <line x1="14" y1="22" x2="38" y2="22" stroke="#d8e2f1" stroke-width="2"/>
    <circle cx="20" cy="30" r="2.5" fill="#d8e2f1"/>
    <circle cx="32" cy="30" r="2.5" fill="#d8e2f1"/>
    <line x1="20" y1="33" x2="20" y2="39" stroke="#d8e2f1" stroke-width="1.6"/>
    <line x1="32" y1="33" x2="32" y2="39" stroke="#d8e2f1" stroke-width="1.6"/>
  </g>
  <text x="230" y="26" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${headerTopFs}" font-weight="700" letter-spacing="0.08em" fill="#0b1d35">${headerTextTop}</text>
  <line x1="96" y1="31" x2="365" y2="31" stroke="#0b1d35" stroke-width="1.6"/>
  <text x="230" y="51" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${headerBottomFs}" font-weight="700" letter-spacing="0.08em" fill="#0b1d35">${headerTextBottom}</text>
  <rect x="0" y="60" width="${CARD_W}" height="${CARD_H - 60}" fill="${BODY_FILL}" stroke="#e2e8f0" stroke-width="1"/>
  ${avatarBlock}
  <text x="${textLeft}" y="${yName}" font-family="Arial, Helvetica, sans-serif" font-size="${nameFs}" font-weight="700" fill="${TEXT_NAME}" letter-spacing="0.03em">${displayName}</text>
  <text x="${textLeft}" y="${ySubtitle}" font-family="Arial, Helvetica, sans-serif" font-size="${subtitleFs}" font-weight="600" fill="${TEXT_MUTED}" letter-spacing="0.04em">${licensedSubtitle}</text>
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
