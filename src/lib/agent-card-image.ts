import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";

const CARD_W = 550;
const CARD_H = 314;
const HEADER_H = 44;
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

  const bodyH = CARD_H - HEADER_H;
  const bodyCy = HEADER_H + bodyH / 2;

  const avatarCx = 80;
  const avatarCy = bodyCy;
  const avatarR = 42;

  const textLeft = avatarCx + avatarR + 20;
  const textWidth = CARD_W - textLeft - 20;

  const nameFs = fitFontSize(nameRaw.length, textWidth, 20, 12);
  const subtitleFs = 9;
  const detailFs = 12;

  const blockH = nameFs + 6 + subtitleFs + 14 + detailFs + 8 + detailFs;
  const blockTop = bodyCy - blockH / 2;

  const yName = blockTop + nameFs;
  const ySubtitle = yName + 6 + subtitleFs;
  const yNpn = ySubtitle + 14 + detailFs;
  const yPhone = yNpn + 8 + detailFs;

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
  <text x="${avatarCx}" y="${avatarCy + 10}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="${TEXT_NAME}">${escapeXml(letter)}</text>
`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${BODY_FILL}" stroke="${BORDER_COLOR}" stroke-width="1.5"/>
  <rect x="0" y="0" width="${CARD_W}" height="${HEADER_H}" rx="10" fill="${HEADER_FILL}"/>
  <rect x="0" y="${HEADER_H - 10}" width="${CARD_W}" height="10" fill="${HEADER_FILL}"/>
  <g transform="translate(14,6)">
    <path d="M16 1 C11 5, 7 5, 1 7 V15 C1 22, 7 27, 16 32 C25 27, 31 22, 31 15 V7 C25 5, 21 5, 16 1 Z" fill="#d8e2f1" stroke="#7b9cc2" stroke-width="1.2"/>
    <path d="M16 5 C12 8, 9 8, 5 9 V15 C5 20, 9 25, 16 28 C23 25, 27 20, 27 15 V9 C23 8, 20 8, 16 5 Z" fill="#2a5a8a"/>
    <line x1="16" y1="9" x2="16" y2="24" stroke="#d8e2f1" stroke-width="1.4"/>
    <line x1="9" y1="14" x2="23" y2="14" stroke="#d8e2f1" stroke-width="1.4"/>
    <circle cx="12" cy="19" r="1.5" fill="#d8e2f1"/>
    <circle cx="20" cy="19" r="1.5" fill="#d8e2f1"/>
  </g>
  <text x="${headerCx}" y="${HEADER_H / 2 + 5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" letter-spacing="0.12em" fill="#ffffff">${escapeXml(headerText)}</text>
  <line x1="0" y1="${HEADER_H}" x2="${CARD_W}" y2="${HEADER_H}" stroke="${BORDER_COLOR}" stroke-width="0.5"/>
  ${avatarBlock}
  <text x="${textLeft}" y="${yName}" font-family="Arial, Helvetica, sans-serif" font-size="${nameFs}" font-weight="700" fill="${TEXT_NAME}" letter-spacing="0.02em">${displayName}</text>
  <text x="${textLeft}" y="${ySubtitle}" font-family="Arial, Helvetica, sans-serif" font-size="${subtitleFs}" font-weight="600" fill="${TEXT_MUTED}" letter-spacing="0.03em">${licensedSubtitle}</text>
  <line x1="${textLeft}" y1="${ySubtitle + 6}" x2="${textLeft + 160}" y2="${ySubtitle + 6}" stroke="${BORDER_COLOR}" stroke-width="0.8"/>
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
