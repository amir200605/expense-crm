import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import Telnyx from "telnyx";
import { buildTelnyxSendParams, getTelnyxApiKey } from "@/lib/telnyx-env";

/** Accept +15551234567, 5551234567, (555) 123-4567, etc. */
function normalizeToE164(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (t.startsWith("+")) {
    return "+" + t.slice(1).replace(/\D/g, "");
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }
  if (digits.length === 10) {
    return "+1" + digits;
  }
  return "+" + digits;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  if (user.role !== "AGENCY_OWNER" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only owners can send test SMS" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? normalizeToE164(body.to) : null;
  if (!to) {
    return NextResponse.json(
      { error: "Valid phone number required (e.g. +15551234567 or 5551234567)" },
      { status: 400 }
    );
  }

  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "TELNYX_API_KEY is missing. In the project root (next to package.json), add to .env.local or .env: TELNYX_API_KEY=your_key (no spaces around =). Restart the dev server. If deployed, set the variable in your host’s dashboard and redeploy.",
      },
      { status: 400 }
    );
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { settings: true },
  });
  const integrations = (agency?.settings as Record<string, unknown>)?.integrations as
    | Record<string, Record<string, string>>
    | undefined;
  const fromNumber = integrations?.telnyx?.fromNumber?.trim();
  if (!fromNumber) {
    return NextResponse.json(
      {
        error:
          "From number is not set. Enter your Telnyx sending number below and click Save integrations first.",
      },
      { status: 400 }
    );
  }

  const text =
    "ExpenseFlow CRM: test SMS. If you received this, Telnyx SMS is configured correctly.";

  try {
    const telnyx = new Telnyx({ apiKey });
    await telnyx.messages.send(
      buildTelnyxSendParams({
        from: fromNumber,
        to,
        text,
      }) as Parameters<typeof telnyx.messages.send>[0],
    );
    return NextResponse.json({ ok: true, message: `Test SMS sent to ${to}` });
  } catch (err: unknown) {
    let message = "Send failed";
    if (err instanceof Error) {
      message = err.message;
      const raw = err as { raw?: { errors?: { detail?: string }[] } };
      const detail = raw.raw?.errors?.[0]?.detail;
      if (detail) message = detail;
    }
    return NextResponse.json({ error: "Failed to send: " + message }, { status: 500 });
  }
}
