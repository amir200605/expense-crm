import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLead } from "@/lib/services/lead.service";

const FIELD_MAP: Record<string, string> = {
  first_name: "firstName",
  firstName: "firstName",
  last_name: "lastName",
  lastName: "lastName",
  phone: "phone",
  email: "email",
  source: "source",
  campaign: "campaign",
  state: "state",
  city: "city",
  zip: "zip",
  vendor: "vendor",
  sub_id: "subId",
  subId: "subId",
};

function mapPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v == null || v === "") continue;
    const key = FIELD_MAP[k] ?? k;
    out[key] = v;
  }
  return out;
}

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await req.json().catch(() => ({}));
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
  } else {
    payload = await req.json().catch(() => ({}));
  }
  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const agency = await prisma.agency.findFirst();
  if (!agency) {
    return NextResponse.json({ error: "No agency configured" }, { status: 503 });
  }

  const mapped = mapPayload(payload);
  const firstName = (mapped.firstName ?? mapped.first_name ?? "") as string;
  const lastName = (mapped.lastName ?? mapped.last_name ?? "") as string;
  const phone = (mapped.phone ?? "") as string;
  const email = (mapped.email ?? "") as string;
  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: "Missing required fields: firstName, lastName, phone" }, { status: 400 });
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: { source: "inbound", payload: payload as object },
  });

  const input = {
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim() : undefined,
    source: (mapped.source as string) ?? undefined,
    campaign: (mapped.campaign as string) ?? undefined,
    state: (mapped.state as string) ?? undefined,
    city: (mapped.city as string) ?? undefined,
    zip: (mapped.zip as string) ?? undefined,
    vendor: (mapped.vendor as string) ?? undefined,
    subId: (mapped.subId as string) ?? undefined,
  };

  const { lead, isDuplicate } = await createLead(agency.id, input, payload);
  await prisma.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: { processedAt: new Date(), leadId: lead.id },
  });

  return NextResponse.json({
    success: true,
    leadId: lead.id,
    isDuplicate: !!isDuplicate,
  }, { status: 200 });
}
