/**
 * Telnyx API key is configured only via server environment — never stored in the DB or exposed to the client.
 */
export function getTelnyxApiKey(): string | undefined {
  const v = process.env.TELNYX_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Optional. Telnyx usually resolves the messaging profile from your `from` number if that number is
 * assigned to a profile in the Mission Control portal. Set this when the API requires an explicit
 * profile UUID (e.g. some alphanumeric-sender or multi-profile setups).
 *
 * @see https://developers.telnyx.com/docs/messaging/messages/messaging-profiles-overview
 */
export function getTelnyxMessagingProfileId(): string | undefined {
  const v = process.env.TELNYX_MESSAGING_PROFILE_ID;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Shared payload for `telnyx.messages.send` */
export function buildTelnyxSendParams(args: { from: string; to: string; text: string }) {
  const messaging_profile_id = getTelnyxMessagingProfileId();
  return messaging_profile_id
    ? { ...args, messaging_profile_id }
    : args;
}
