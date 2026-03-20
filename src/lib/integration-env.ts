import { loadEnvConfig } from "@next/env";

if (typeof process !== "undefined") {
  try {
    loadEnvConfig(process.cwd());
  } catch {
    /* ignore */
  }
}

/** Runtime-built keys so Next.js does not inline missing build-time env as undefined. */
function read(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const OUTLOOK_FROM_EMAIL = "OUTLOOK" + "_" + "FROM_EMAIL";
const OUTLOOK_SMTP_USER = "OUTLOOK" + "_" + "SMTP_USER";
const OUTLOOK_SMTP_PASSWORD = "OUTLOOK" + "_" + "SMTP_PASSWORD";
const TELNYX_FROM_NUMBER = "TELNYX" + "_" + "FROM_NUMBER";

/**
 * Outlook / Office 365 SMTP: env overrides DB (Replit Secrets / .env).
 * Secret names: OUTLOOK_FROM_EMAIL, OUTLOOK_SMTP_USER, OUTLOOK_SMTP_PASSWORD
 */
export function resolveOutlookIntegration(db?: {
  fromEmail?: string;
  smtpUser?: string;
  smtpPass?: string;
}) {
  return {
    fromEmail: read(OUTLOOK_FROM_EMAIL) ?? db?.fromEmail ?? "",
    smtpUser: read(OUTLOOK_SMTP_USER) ?? db?.smtpUser ?? "",
    smtpPass: read(OUTLOOK_SMTP_PASSWORD) ?? db?.smtpPass ?? "",
  };
}

/**
 * Telnyx sending number: TELNYX_FROM_NUMBER env overrides DB integrations.telnyx.fromNumber
 */
export function resolveTelnyxFromNumber(dbFrom: string | undefined): string {
  return read(TELNYX_FROM_NUMBER) ?? (dbFrom?.trim() ?? "");
}

export type IntegrationsLike = {
  telnyx?: { fromNumber?: string };
  outlook?: { fromEmail?: string; smtpUser?: string; smtpPass?: string };
};

/** Merge DB-stored integrations with server env (secrets). */
export function mergeIntegrationsWithEnv(raw: IntegrationsLike | undefined): IntegrationsLike {
  const r = raw ?? {};
  return {
    telnyx: {
      fromNumber: resolveTelnyxFromNumber(r.telnyx?.fromNumber),
    },
    outlook: resolveOutlookIntegration(r.outlook),
  };
}

/** For Settings UI diagnostics (no secret values). */
export function getIntegrationEnvPresence() {
  return {
    outlookFromEmail: Boolean(read(OUTLOOK_FROM_EMAIL)),
    outlookSmtpUser: Boolean(read(OUTLOOK_SMTP_USER)),
    outlookSmtpPass: Boolean(read(OUTLOOK_SMTP_PASSWORD)),
    telnyxFromNumber: Boolean(read(TELNYX_FROM_NUMBER)),
  };
}
