import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";

// Load .env / .env.local from project root (idempotent; helps server code see vars consistently)
if (typeof process !== "undefined") {
  try {
    loadEnvConfig(process.cwd());
  } catch {
    /* ignore outside Next / tests */
  }
}

function readServerEnv(name: string): string | undefined {
  // Bracket access avoids some bundlers inlining missing build-time env as undefined in production
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
      const m = trimmed.match(new RegExp(`^${key}\\s*=\\s*(.*)$`));
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

function getSecret(key: string): string | undefined {
  return readServerEnv(key) ?? readEnvFileValue(key);
}

/**
 * Telnyx API key is configured only via server environment — never stored in the DB or exposed to the client.
 *
 * Set in **`.env.local`** or **`.env`** at the project root (same folder as `package.json`):
 * `TELNYX_API_KEY=key_xxxxxxxx`
 * Restart `npm run dev` after changing. On Netlify/Railway/etc., add the variable in the host's Environment / Secrets UI.
 */
export function getTelnyxApiKey(): string | undefined {
  return getSecret("TELNYX_API_KEY");
}

/**
 * Optional. Telnyx usually resolves the messaging profile from your `from` number if that number is
 * assigned to a profile in the Mission Control portal. Set this when the API requires an explicit
 * profile UUID (e.g. some alphanumeric-sender or multi-profile setups).
 *
 * @see https://developers.telnyx.com/docs/messaging/messages/messaging-profiles-overview
 */
export function getTelnyxMessagingProfileId(): string | undefined {
  return getSecret("TELNYX_MESSAGING_PROFILE_ID");
}

/** Shared payload for `telnyx.messages.send` */
export function buildTelnyxSendParams(args: { from: string; to: string; text: string }) {
  const messaging_profile_id = getTelnyxMessagingProfileId();
  return messaging_profile_id
    ? { ...args, messaging_profile_id }
    : args;
}
