import Telnyx from "telnyx";
import { prisma } from "@/lib/db";
import { resolveTelnyxFromNumber } from "@/lib/integration-env";
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

async function logWelcomeSmsOnLead(params: {
  logToLead?: { leadId: string; userId: string | null };
  to: string | null;
  body: string;
  sent: boolean;
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

  if (!apiKey || !fromNumber || !phone) {
    const explanation = !apiKey
      ? "Telnyx API key is not set. Add TELNYX_API_KEY in your host secrets (e.g. Replit) and/or configure it under Settings → Integrations."
      : !fromNumber
        ? "SMS “From” number is not set. Add it under Settings → Integrations (Telnyx) or set TELNYX_FROM_NUMBER in environment."
        : "This client has no phone number, so no welcome SMS was sent.";
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: phone || null,
      body: `Welcome SMS was not sent. ${explanation}`,
      sent: false,
    });
    return { sent: false, reason: "missing_telnyx_or_phone" };
  }

  const clientName = `${params.client.firstName} ${params.client.lastName}`.trim();
  const carrierName = params.policy?.carrier ?? params.client.carrier ?? "N/A";
  const policyNumber = params.policy?.policyNumber ?? "N/A";
  const coverageAmount = formatMoney(params.policy?.faceAmount);
  const monthlyPremium = formatMoney(params.policy?.premium ?? params.client.premiumAmount);
  const draftDate = params.policy?.paymentDraftDate
    ? new Date(params.policy.paymentDraftDate).toLocaleDateString("en-US")
    : "N/A";

  const message = `Hey ${clientName}, this is ${params.agentName}, your life insurance agent. If you have any questions about your policy with ${carrierName}, feel free to call or text me here anytime. My office number is 877-864-9126.

Here are your policy details for reference:

Policy Number: ${policyNumber}

Coverage Amount: ${coverageAmount}

Monthly Premium: $${monthlyPremium}

Payment Method: Direct Express card

Draft Date: ${draftDate}

For customer service, you can also contact TransAmerica at 877-234-4848.

You've taken an important step toward ensuring your family is protected and prepared for any final expenses. If you have any questions or need anything at all, please don't hesitate to reach out-I'm here to help anytime!
${getCarrierServiceNumber(carrierName)}
Aetna-866-272-6630
Aflac-866-272-6630 (Option 1)
AIG (Corebridge) 800-255-2702
American Amicable-800-736-7311
Americo 800-231-0801
CICA 737-289-4670
Ethos 415-498-1734
Fidelity & Guarantee Life (F&G) 800-445-6758
InstaBrain 1-800-806-9714
Mutual of Omaha 800-775-7896
TransAmerica 877-234-4848`;

  const telnyx = new Telnyx({ apiKey });
  try {
    await telnyx.messages.send(
      buildTelnyxSendParams({
        from: fromNumber,
        to: phone,
        text: message,
      }) as Parameters<typeof telnyx.messages.send>[0],
    );
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await logWelcomeSmsOnLead({
      logToLead: params.logToLead,
      to: phone,
      body: `Welcome SMS failed to send (Telnyx error): ${detail}`,
      sent: false,
    });
    return { sent: false, reason: "telnyx_api_error", detail };
  }

  await logWelcomeSmsOnLead({
    logToLead: params.logToLead,
    to: phone,
    body: message,
    sent: true,
  });

  return { sent: true };
}
