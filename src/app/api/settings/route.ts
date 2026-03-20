import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { getTelnyxApiKey } from "@/lib/telnyx-env";

/** Replit injects secrets at runtime; avoid static `process.env.REPL_ID` inlining at build. */
function isReplitRuntime(): boolean {
  const rid = "REPL" + "_ID";
  const rslug = "REPL" + "_SLUG";
  return Boolean(process.env[rid] ?? process.env[rslug]);
}

const MASK = "••••••••";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function maskIntegrations(raw: Record<string, Record<string, string>> | undefined) {
  if (!raw) return {};
  return {
    /** SMS API key lives in TELNYX_API_KEY env only — not stored in DB */
    telnyx: raw.telnyx
      ? {
          fromNumber: raw.telnyx.fromNumber ?? "",
        }
      : {},
    outlook: raw.outlook
      ? {
          fromEmail: raw.outlook.fromEmail ?? "",
          smtpUser: raw.outlook.smtpUser ?? "",
          smtpPass: raw.outlook.smtpPass ? MASK : "",
        }
      : {},
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true, billingEmail: true, slug: true, settings: true },
  });
  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  const settings = (agency.settings as Record<string, unknown>) ?? {};
  const integrations = maskIntegrations(settings.integrations as Record<string, Record<string, string>>);
  const rawTelnyx = (settings.integrations as Record<string, Record<string, string>> | undefined)?.telnyx;
  const fromSaved = Boolean(rawTelnyx?.fromNumber?.trim());

  return NextResponse.json({
    agency: {
      id: agency.id,
      name: agency.name,
      billingEmail: agency.billingEmail,
      slug: agency.slug,
      integrations,
    },
    integrationsMeta: {
      telnyxApiKeyConfigured: Boolean(getTelnyxApiKey()),
      telnyxFromNumberSaved: fromSaved,
      replit: isReplitRuntime(),
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  if (user.role !== "AGENCY_OWNER" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only agency owners and super admins can update settings" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.billingEmail === "string") {
    data.billingEmail = body.billingEmail.trim() || null;
  }
  if (body.integrations !== undefined && typeof body.integrations === "object") {
    const agencyRow = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { settings: true },
    });
    const current = (agencyRow?.settings as Record<string, Record<string, Record<string, string>>>) ?? {};
    const curInt = current.integrations ?? {};
    const newInt = body.integrations as Record<string, Record<string, string>>;
    const curTelnyxClean = curInt.telnyx ? { fromNumber: curInt.telnyx.fromNumber ?? "" } : {};
    const merged = {
      telnyx:
        newInt.telnyx !== undefined && newInt.telnyx !== null
          ? { fromNumber: newInt.telnyx.fromNumber ?? curInt.telnyx?.fromNumber ?? "" }
          : curTelnyxClean,
      outlook: newInt.outlook
        ? {
            fromEmail: newInt.outlook.fromEmail ?? curInt.outlook?.fromEmail ?? "",
            smtpUser: newInt.outlook.smtpUser ?? curInt.outlook?.smtpUser ?? "",
            smtpPass: newInt.outlook.smtpPass && newInt.outlook.smtpPass !== MASK ? newInt.outlook.smtpPass : (curInt.outlook?.smtpPass ?? ""),
          }
        : curInt.outlook ?? {},
    };
    data.settings = { ...current, integrations: merged };
  }

  const agency = await prisma.agency.update({
    where: { id: agencyId },
    data,
    select: { id: true, name: true, billingEmail: true, slug: true, settings: true },
  });

  const settings = (agency.settings as Record<string, unknown>) ?? {};
  const integrations = maskIntegrations(settings.integrations as Record<string, Record<string, string>>);
  const rawTelnyxPatch = (settings.integrations as Record<string, Record<string, string>> | undefined)?.telnyx;
  const fromSavedPatch = Boolean(rawTelnyxPatch?.fromNumber?.trim());

  return NextResponse.json({
    agency: {
      id: agency.id,
      name: agency.name,
      billingEmail: agency.billingEmail,
      slug: agency.slug,
      integrations,
    },
    integrationsMeta: {
      telnyxApiKeyConfigured: Boolean(getTelnyxApiKey()),
      telnyxFromNumberSaved: fromSavedPatch,
      replit: isReplitRuntime(),
    },
  });
}
