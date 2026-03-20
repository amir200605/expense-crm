import { loadEnvConfig } from "@next/env";

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
 * Telnyx API key is configured only via server environment — never stored in the DB or exposed to the client.
 *
 * Set in **`.env.local`** or **`.env`** at the project root (same folder as `package.json`):
 * `TELNYX_API_KEY=key_xxxxxxxx`
 * Restart `npm run dev` after changing. On Netlify/Railway/etc., add the variable in the host's Environment / Secrets UI.
 */
export function getTelnyxApiKey(): string | undefined {
  return readServerEnv("TELNYX_API_KEY");
}

/**
 * Optional. Telnyx usually resolves the messaging profile from your `from` number if that number is
 * assigned to a profile in the Mission Control portal. Set this when the API requires an explicit
 * profile UUID (e.g. some alphanumeric-sender or multi-profile setups).
 *
 * @see https://developers.telnyx.com/docs/messaging/messages/messaging-profiles-overview
 */
export function getTelnyxMessagingProfileId(): string | undefined {
  return readServerEnv("TELNYX_MESSAGING_PROFILE_ID");
}

/** Shared payload for `telnyx.messages.send` */
export function buildTelnyxSendParams(args: { from: string; to: string; text: string }) {
  const messaging_profile_id = getTelnyxMessagingProfileId();
  return messaging_profile_id
    ? { ...args, messaging_profile_id }
    : args;
}
