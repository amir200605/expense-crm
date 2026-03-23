import Telnyx from "telnyx";
import { prisma } from "@/lib/db";
import { resolveTelnyxFromNumber } from "@/lib/integration-env";
import { normalizePhoneToE164 } from "@/lib/phone-e164";
import { buildTelnyxSendParams, getTelnyxApiKey } from "@/lib/telnyx-env";

type PolicyLike = {
  carrier?: string | null;
  policyNumber?: string | null;
  faceAmount?: { toString: () => string } | number | string | null;
  premium?: { toString: () => string } | number | string | null;
  paymentDraftDate?: Date | null;
} | null;

type ClientLike = {
  firstName: string;
  lastName: string;
  phone: string;
  carrier?: string | null;
  premiumAmount?: { toString: () => string } | number | string | null;
};

const CARRIER_SERVICE_NUMBERS: Record<string, string> = {
  aetna: "866-272-6630",
  aflac: "866-272-6630 (Option 1)",
  aig: "800-255-2702",
  corebridge: "800-255-2702",
  "american amicable": "800-736-7311",
  americo: "800-231-0801",
  cica: "737-289-4670",
  ethos: "415-498-1734",
  "fidelity & guarantee life (f&g)": "800-445-6758",
  "fidelity & guarantee life": "800-445-6758",
  "instabrain": "1-800-806-9714",
  "mutual of omaha": "800-775-7896",
  transamerica: "877-234-4848",
};

function formatMoney(v: unknown): string {
  if (v === null || v === undefined || v === "") return "N/A";
  const raw = typeof v === "object" && v && "toString" in v ? (v as { toString: () => string }).toString() : String(v);
  const n = Number(raw);
  if (Number.isFinite(n)) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return raw;
}

function getCarrierServiceNumber(carrier: string | null | undefined): string {
  if (!carrier) return "Carrier customer service number: N/A";
  const key = carrier.toLowerCase().trim();
  const direct = CARRIER_SERVICE_NUMBERS[key];
  if (direct) return `Carrier customer service number: ${direct}`;
  const match = Object.entries(CARRIER_SERVICE_NUMBERS).find(([k]) => key.includes(k));
  return `Carrier customer service number: ${match?.[1] ?? "N/A"}`;
}

const DEFAULT_OFFICE_NUMBER = "877-864-9126";
const DEFAULT_WELCOME_SMS_TEMPLATE = `Hey {{clientName}}, this is {{agentName}}, your life insurance agent. If you have any questions about your policy with {{carrierName}}, feel free to call or text me here anytime. My office number is {{officeNumber}}.

Here are your policy details for reference:

Policy Number: {{policyNumber}}

Coverage Amount: {{coverageAmount}}

Monthly Premium: \${{monthlyPremium}}

Payment Method: Direct Express card

Draft Date: {{draftDate}}

For customer service, you can also contact TransAmerica at 877-234-4848.

You've taken an important step toward ensuring your family is protected and prepared for any final expenses. If you have any questions or need anything at all, please don't hesitate to reach out-I'm here to help anytime!
{{carrierServiceNumber}}`;

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => vars[key] ?? "");
}

function toStringValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    if ("toString" in v) return String((v as { toString: () => string }).toString());
  }
  return String(v);
}

async function logWelcomeSmsOnLead(params: {
  logToLead?: { leadId: string; userId: string | null };
  to: string | null;
  body: string;
  sent: boolean;
  mediaAttached?: boolean;
}) {
  if (!params.logToLead?.leadId) return;
  await prisma.activityLog.create({
    data: {
      userId: params.logToLead.userId,
      action: "SMS_SENT",
      entityType: "Lead",
      entityId: params.logToLead.leadId,
      newValue: {
        to: params.to,
        message: params.body,
        sent: params.sent,
        source: "client_welcome",
        mediaAttached: params.mediaAttached ?? false,
      },
    },
  });
}

export type SendClientWelcomeSmsResult =
  | { sent: true }
  | { sent: false; reason: "missing_telnyx_or_phone" | "telnyx_api_error"; detail?: string };

export async function sendClientWelcomeSms(params: {
  agencyId: string;
  client: ClientLike;
  policy?: PolicyLike;
  agentName: string;
  agentCardImageUrl?: string | null;
  /** When the client was created from a lead, log the SMS on that lead’s communications. */
  logToLead?: { leadId: string; userId: string | null };
}) {
  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { settings: true },
  });
  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, string>>) ?? {};
  const telnyxConfig = integrations.telnyx ?? {};
  const fromNumber = resolveTelnyxFromNumber(telnyxConfig.fromNumber);
  const apiKey = getTelnyxApiKey();
  const phone = params.client.phone?.trim() ?? "";

  if (!apiKey || !fromNumber) {
    const explanation = !apiKey
      ? "Telnyx API key is not set. Add TELNYX_API_KEY in your host secrets (e.g. Replit) and/or configure it under Settings → Integrations."
      : "SMS “From” number is not set. Add it under Settings → Integrations (Telnyx) or set TELNYX_FROM_NUMBER in environment.";
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: phone || null,
      body: `Welcome SMS was not sent. ${explanation}`,
      sent: false,
      mediaAttached: false,
    });
    return { sent: false, reason: "missing_telnyx_or_phone" };
  }

  if (!phone) {
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: null,
      body: "Welcome SMS was not sent: this client has no phone number on file.",
      sent: false,
      mediaAttached: false,
    });
    return { sent: false, reason: "missing_telnyx_or_phone" };
  }

  const e164To = normalizePhoneToE164(phone);
  if (!e164To) {
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: phone,
      body: `Welcome SMS was not sent: phone number could not be converted to E.164 for Telnyx (error 40310). Stored value: ${JSON.stringify(phone)}. Use 10 digits (e.g. 5614515321) or E.164 (+15614515321). Remove letters and extra numbers.`,
      sent: false,
      mediaAttached: false,
    });
    return { sent: false, reason: "missing_telnyx_or_phone" };
  }

  const clientName = `${params.client.firstName} ${params.client.lastName}`.trim();

  const template = (settings.templates as { welcomeSms?: string } | undefined)?.welcomeSms?.trim() || DEFAULT_WELCOME_SMS_TEMPLATE;
  const lead = params.logToLead?.leadId
    ? await prisma.lead.findUnique({
        where: { id: params.logToLead.leadId },
        select: {
          firstName: true,
          lastName: true,
          fullName: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          zip: true,
          disposition: true,
          pipelineStage: true,
          source: true,
          notes: true,
          rawPayload: true,
        },
      })
    : null;
  const leadRaw = (lead?.rawPayload as Record<string, unknown> | null) ?? {};
  const leadVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(leadRaw)) {
    leadVars[k] = toStringValue(v);
  }
  if (lead) {
    leadVars.leadFirstName = lead.firstName ?? "";
    leadVars.leadLastName = lead.lastName ?? "";
    leadVars.leadFullName = lead.fullName ?? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim();
    leadVars.leadPhone = lead.phone ?? "";
    leadVars.leadEmail = lead.email ?? "";
    leadVars.leadCity = lead.city ?? "";
    leadVars.leadState = lead.state ?? "";
    leadVars.leadZip = lead.zip ?? "";
    leadVars.leadDisposition = lead.disposition ?? "";
    leadVars.leadPipelineStage = lead.pipelineStage ?? "";
    leadVars.leadSource = lead.source ?? "";
    if (!leadVars.notes) leadVars.notes = lead.notes ?? "";
  }
  const policyNumber =
    params.policy?.policyNumber?.trim() ||
    (leadVars.policyNumber ?? "").trim() ||
    "N/A";
  const coverageAmount = formatMoney(
    params.policy?.faceAmount ??
      leadVars.faceAmount ??
      leadVars.coverageAmount,
  );
  const monthlyPremium = formatMoney(
    params.policy?.premium ??
      params.client.premiumAmount ??
      leadVars.premium ??
      leadVars.monthlyPremium,
  );
  const draftDate = params.policy?.paymentDraftDate
    ? new Date(params.policy.paymentDraftDate).toLocaleDateString("en-US")
    : ((leadVars.draftDate ?? "").trim() || "N/A");
  const carrierFromForm = (leadVars.carrierQuoted ?? "").trim();
  const carrierName = carrierFromForm || params.policy?.carrier || params.client.carrier || "N/A";
  const mediaUrls: string[] = [];
  if (params.agentCardImageUrl?.trim()) {
    mediaUrls.push(params.agentCardImageUrl.trim());
  }

  const message = renderTemplate(template, {
    ...leadVars,
    clientName,
    agentName: params.agentName,
    carrierName,
    policyNumber,
    coverageAmount,
    monthlyPremium,
    draftDate,
    carrierServiceNumber: getCarrierServiceNumber(carrierName),
    officeNumber: DEFAULT_OFFICE_NUMBER,
  });

  const telnyx = new Telnyx({ apiKey });

  let textParams: ReturnType<typeof buildTelnyxSendParams>;
  try {
    textParams = buildTelnyxSendParams({
      from: fromNumber,
      to: phone,
      text: message,
    }) as ReturnType<typeof buildTelnyxSendParams>;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: e164To,
      body: `Welcome SMS was not sent: ${detail}`,
      sent: false,
      mediaAttached: false,
    });
    return { sent: false, reason: "missing_telnyx_or_phone", detail };
  }

  try {
    await telnyx.messages.send(textParams as Parameters<typeof telnyx.messages.send>[0]);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: e164To,
      body: `Welcome SMS failed to send (Telnyx error): ${detail}`,
      sent: false,
      mediaAttached: false,
    });
    return { sent: false, reason: "telnyx_api_error", detail };
  }

  if (mediaUrls.length > 0) {
    try {
      const cardParams = buildTelnyxSendParams({
        from: fromNumber,
        to: phone,
        text: "",
        mediaUrls,
      }) as ReturnType<typeof buildTelnyxSendParams>;
      try {
        await telnyx.messages.sendLongCode(
          cardParams as Parameters<typeof telnyx.messages.sendLongCode>[0],
        );
      } catch {
        await telnyx.messages.send(cardParams as Parameters<typeof telnyx.messages.send>[0]);
      }
    } catch (cardErr) {
      console.warn("[welcome-sms] agent card MMS failed (text was sent):", cardErr);
    }
  }

  await logWelcomeSmsOnLead({
    logToLead: params.logToLead,
    to: e164To,
    body: message,
    sent: true,
    mediaAttached: mediaUrls.length > 0,
  });

  return { sent: true };
}
