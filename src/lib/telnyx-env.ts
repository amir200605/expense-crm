import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";
import { normalizePhoneToE164 } from "@/lib/phone-e164";

// Load .env / .env.local from project root (idempotent; helps server code see vars consistently)
if (typeof process !== "undefined") {
  try {
    loadEnvConfig(process.cwd());
  } catch {
    /* ignore outside Next / tests */
  }
}

/**
 * Build env var names at runtime so Next.js webpack does not replace `process.env.TELNYX_API_KEY`
 * with `undefined` when the key was missing at **build** time (common on Replit / CI where secrets
 * exist only at **runtime**).
 */
const ENV_TELNYX_API_KEY = "TELNYX" + "_" + "API_KEY";
const ENV_TELNYX_MESSAGING_PROFILE_ID = "TELNYX" + "_" + "MESSAGING" + "_" + "PROFILE" + "_" + "ID";

function readServerEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * If process.env is empty (some dev setups), read the key from .env.local / .env on disk (Node only).
 */
function readEnvFileValue(key: string): string | undefined {
  if (typeof process === "undefined" || !process.versions?.node) return undefined;
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const fp = path.join(root, file);
    if (!fs.existsSync(fp)) continue;
    let text: string;
    try {
      text = fs.readFileSync(fp, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = trimmed.match(new RegExp(`^${escaped}\\s*=\\s*(.*)$`));
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v) return v;
    }
  }
  return undefined;
}

function getSecret(name: string): string | undefined {
  return readServerEnv(name) ?? readEnvFileValue(name);
}

/**
 * Telnyx API key — server env / Replit Secrets only (never in DB or client).
 *
 * Replit: Tools → Secrets → name must be exactly `TELNYX_API_KEY`, then Stop + Run the Repl.
 * Deployments: add the same secret under deployment secrets and redeploy.
 */
export function getTelnyxApiKey(): string | undefined {
  const primary = getSecret(ENV_TELNYX_API_KEY);
  if (primary) return primary;
  // Optional alternate name if someone misnamed the secret
  return getSecret("TELNYX" + "_" + "KEY");
}

/**
 * Optional messaging profile UUID (Telnyx Mission Control).
 */
export function getTelnyxMessagingProfileId(): string | undefined {
  return getSecret(ENV_TELNYX_MESSAGING_PROFILE_ID);
}

/** Shared payload for `telnyx.messages.send` — normalizes from/to to E.164 (Telnyx requirement). */
export function buildTelnyxSendParams(args: { from: string; to: string; text: string }) {
  const messaging_profile_id = getTelnyxMessagingProfileId();
  const to = normalizePhoneToE164(args.to);
  if (!to) {
    throw new Error(
      `Invalid destination phone "${args.to}". Use 10 digits (e.g. 5614515321) or E.164 (+15614515321). No letters or multiple numbers.`
    );
  }
  const from = normalizePhoneToE164(args.from);
  if (!from) {
    throw new Error(
      `Invalid From phone "${args.from}". Use E.164 in Settings → Integrations or TELNYX_FROM_NUMBER (e.g. +15614515321).`
    );
  }
  const payload = { from, to, text: args.text };
  return messaging_profile_id
    ? { ...payload, messaging_profile_id }
    : payload;
}
