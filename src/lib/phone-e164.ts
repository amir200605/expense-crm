/**
 * Normalize a phone string to E.164 for Telnyx SMS.
 * Telnyx rejects "to" unless it is a single valid E.164 number (error 40310).
 *
 * - US/Canada 10-digit NANP → +1XXXXXXXXXX
 * - 11 digits starting with 1 → +1XXXXXXXXXX
 * - Already has + → +{digits}
 * - Other 11–15 digit international (digits only) → +{digits}
 */
export function normalizePhoneToE164(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;

  // Only the first number if multiple are pasted
  s = s.split(/[,;/]/)[0]?.trim() ?? "";
  if (!s) return null;

  // Strip extension: "555-1234 ext 99" → "555-1234"
  const extMatch = s.match(/^(.*?)\s*(?:ext\.?|x|#)\s*\d+/i);
  if (extMatch) s = extMatch[1].trim();
  if (!s) return null;

  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) return null;

  if (hasPlus) {
    return `+${digits}`;
  }

  // NANP 10-digit (US/Canada)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Leading country code 1 + 10-digit NANP
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // International without + (11–15 digits)
  return `+${digits}`;
}
