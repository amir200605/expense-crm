import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";

const CARD_W = 800;
const CARD_H = 340;
const HEADER_H = 70;
const HEADER_FILL = "#1d3557";
const BODY_FILL = "#ffffff";
const TEXT_MUTED = "#475569";
const TEXT_NAME = "#0f766e";
const BORDER_COLOR = "#cbd5e1";

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

function fitFontSize(charCount: number, maxWidthPx: number, maxPx: number, minPx: number): number {
  const n = Math.max(charCount, 1);
  const ideal = maxWidthPx / (n * 0.58);
  return Math.round(Math.max(minPx, Math.min(maxPx, ideal)));
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
  return (n.charAt(0) || u.charAt(0) || "A").toUpperCase();
}

export async function buildAgentCardPngBuffer(opts: {
  agencyName: string;
  name: string;
  username: string | null;
  role: string;
  npnNumber: string | null;
  phone: string | null;
  avatarUrl: string | null;
}): Promise<Buffer> {
  const headerText = "PRIME INSURANCE AGENCY";
  const nameRaw = (opts.name.trim() || "TEAM MEMBER").toUpperCase();
  const displayName = escapeXml(nameRaw);
  const npnTrim = (opts.npnNumber ?? "").trim();
  const displayNpn = escapeXml(npnTrim || EMPTY_DASH);
  const displayPhone = escapeXml(formatPhoneDisplay(opts.phone));
  const licensedSubtitle = "LICENSED LIFE &amp; HEALTH INSURANCE AGENT";

  const avatarCx = 110;
  const avatarCy = HEADER_H + (CARD_H - HEADER_H) / 2;
  const avatarR = 56;

  const textLeft = avatarCx + avatarR + 30;
  const textWidth = CARD_W - textLeft - 30;

  const nameFs = fitFontSize(nameRaw.length, textWidth, 34, 16);
  const subtitleFs = Math.round(Math.min(13, Math.max(9, nameFs * 0.38)));
  const detailFs = Math.round(Math.min(17, Math.max(12, nameFs * 0.48)));

  const yName = HEADER_H + 50;
  const ySubtitle = yName + Math.round(nameFs * 0.9) + 6;
  const yNpn = ySubtitle + Math.round(subtitleFs * 1.2) + 14;
  const yPhone = yNpn + Math.round(detailFs * 1.3) + 6;

  const headerCx = CARD_W / 2;

  const avatarData = await loadAvatarDataUri(opts.avatarUrl);
  const letter = initialLetter(opts.name, opts.username);

  const avatarBlock = avatarData
    ? `
  <defs>
    <clipPath id="avclip"><circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}"/></clipPath>
  </defs>
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 2}" fill="${BORDER_COLOR}"/>
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#f0fdfa"/>
  <image href="${avatarData}" x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" clip-path="url(#avclip)" preserveAspectRatio="xMidYMid slice"/>
`
    : `
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 2}" fill="${BORDER_COLOR}"/>
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#f0fdfa"/>
  <text x="${avatarCx}" y="${avatarCy + 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600" fill="${TEXT_NAME}">${escapeXml(letter)}</text>
`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="12" fill="${BODY_FILL}" stroke="${BORDER_COLOR}" stroke-width="2"/>
  <rect x="0" y="0" width="${CARD_W}" height="${HEADER_H}" rx="12" fill="${HEADER_FILL}"/>
  <rect x="0" y="${HEADER_H - 12}" width="${CARD_W}" height="12" fill="${HEADER_FILL}"/>
  <g transform="translate(20,10)">
    <path d="M22 2 C15 7, 9 7, 2 9 V20 C2 30, 10 38, 22 44 C34 38, 42 30, 42 20 V9 C35 7, 29 7, 22 2 Z" fill="#d8e2f1" stroke="#7b9cc2" stroke-width="1.5"/>
    <path d="M22 8 C17 11, 12 11, 8 13 V20 C8 27, 13 33, 22 38 C31 33, 36 27, 36 20 V13 C32 11, 27 11, 22 8 Z" fill="#2a5a8a"/>
    <line x1="22" y1="13" x2="22" y2="32" stroke="#d8e2f1" stroke-width="1.8"/>
    <line x1="12" y1="19" x2="32" y2="19" stroke="#d8e2f1" stroke-width="1.8"/>
    <circle cx="17" cy="26" r="2" fill="#d8e2f1"/>
    <circle cx="27" cy="26" r="2" fill="#d8e2f1"/>
  </g>
  <text x="${headerCx}" y="${HEADER_H / 2 + 7}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="0.12em" fill="#ffffff">${escapeXml(headerText)}</text>
  ${avatarBlock}
  <text x="${textLeft}" y="${yName}" font-family="Arial, Helvetica, sans-serif" font-size="${nameFs}" font-weight="700" fill="${TEXT_NAME}" letter-spacing="0.03em">${displayName}</text>
  <text x="${textLeft}" y="${ySubtitle}" font-family="Arial, Helvetica, sans-serif" font-size="${subtitleFs}" font-weight="600" fill="${TEXT_MUTED}" letter-spacing="0.04em">${licensedSubtitle}</text>
  <line x1="${textLeft}" y1="${ySubtitle + 8}" x2="${textLeft + 180}" y2="${ySubtitle + 8}" stroke="${BORDER_COLOR}" stroke-width="1"/>
  <text x="${textLeft}" y="${yNpn}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFs}" fill="${TEXT_MUTED}"><tspan font-weight="600">NPN:</tspan> ${displayNpn}</text>
  <text x="${textLeft}" y="${yPhone}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFs}" fill="${TEXT_MUTED}"><tspan font-weight="600">Phone:</tspan> ${displayPhone}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

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
