import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fireAutomationTrigger } from "@/lib/services/automation-engine";

const interestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = interestSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors?.name?.[0]
        ?? parsed.error.flatten().fieldErrors?.email?.[0]
        ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, phone, message } = parsed.data;

    const agency = await prisma.agency.findFirst({ orderBy: { createdAt: "asc" } });
    if (!agency) {
      return NextResponse.json(
        { error: "Service is not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    const nameParts = name.trim().split(/\s+/);
    const firstName = (nameParts[0] ?? name.trim()) || "—";
    const lastName = nameParts.slice(1).join(" ") || "—";
    const phoneValue = (phone?.trim() && phone.trim().length > 0) ? phone.trim() : "—";

    const lead = await prisma.lead.create({
      data: {
        agencyId: agency.id,
        firstName,
        lastName,
        fullName: name.trim(),
        phone: phoneValue,
        email: email.trim(),
        source: "Website",
        disposition: "NEW",
        pipelineStage: "NEW_LEAD",
        notes: message?.trim() || null,
      },
    });

    const owner = await prisma.user.findFirst({
      where: { agencyId: agency.id, role: "AGENCY_OWNER" },
      select: { id: true },
    });
    const userId = owner?.id ?? (await prisma.user.findFirst({
      where: { agencyId: agency.id },
      select: { id: true },
    }))?.id;

    if (userId) {
      await fireAutomationTrigger("LEAD_CREATED", {
        agencyId: agency.id,
        userId,
        leadId: lead.id,
      });
    }

    // In-app notifications for agency owners so they see new leads even without email
    const owners = await prisma.user.findMany({
      where: { agencyId: agency.id, role: "AGENCY_OWNER" },
      select: { id: true },
    });
    const leadName = name.trim() || [firstName, lastName].filter(Boolean).join(" ") || "Someone";
    for (const owner of owners) {
      await prisma.notification.create({
        data: {
          userId: owner.id,
          title: "New lead from website",
          message: `${leadName} submitted the Get in touch form.`,
          link: `/leads/${lead.id}`,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Thanks! We'll be in touch." });
  } catch (e) {
    console.error("[interest] POST error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
