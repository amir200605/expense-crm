import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { resolveOutlookIntegration } from "@/lib/integration-env";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 403 });

  if (user.role !== "AGENCY_OWNER" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only owners can send test emails" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to.trim()) ? body.to.trim() : null;
  if (!to) return NextResponse.json({ error: "Valid 'to' email required" }, { status: 400 });

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { settings: true },
  });
  const integrations = (agency?.settings as Record<string, unknown>)?.integrations as Record<string, Record<string, string>> | undefined;
  const outlook = resolveOutlookIntegration(integrations?.outlook);
  if (!outlook.smtpUser || !outlook.smtpPass || !outlook.fromEmail) {
    return NextResponse.json({
      error:
        "Outlook integration not configured. Set From email, SMTP user, and SMTP password in Settings → Integrations, or set server secrets OUTLOOK_FROM_EMAIL, OUTLOOK_SMTP_USER, OUTLOOK_SMTP_PASSWORD (e.g. Replit Secrets).",
    }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: outlook.smtpUser, pass: outlook.smtpPass },
    });
    await transporter.sendMail({
      from: outlook.fromEmail,
      to,
      subject: "ExpenseFlow test email",
      text: "This is a test email from your ExpenseFlow CRM. If you received this, your Outlook integration is working.",
    });
    return NextResponse.json({ ok: true, message: "Test email sent to " + to });
  } catch (err: unknown) {
    let message = "Send failed";
    if (err instanceof Error) {
      message = err.message;
      const code = (err as { code?: string }).code;
      const response = (err as { response?: string }).response;
      if (code) message += ` (${code})`;
      if (response) message += " — " + String(response).slice(0, 200);
    }
    return NextResponse.json({ error: "Failed to send: " + message }, { status: 500 });
  }
}
