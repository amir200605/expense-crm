/**
 * Telnyx API key is configured only via server environment — never stored in the DB or exposed to the client.
 */
export function getTelnyxApiKey(): string | undefined {
  const v = process.env.TELNYX_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
