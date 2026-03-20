import Telnyx from "telnyx";
import { prisma } from "@/lib/db";
import { getTelnyxApiKey } from "@/lib/telnyx-env";

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

export async function sendClientWelcomeSms(params: {
  agencyId: string;
  client: ClientLike;
  policy?: PolicyLike;
  agentName: string;
}) {
  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { settings: true },
  });
  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, string>>) ?? {};
  const telnyxConfig = integrations.telnyx ?? {};
  const apiKey = getTelnyxApiKey();

  if (!apiKey || !telnyxConfig.fromNumber || !params.client.phone?.trim()) {
    return { sent: false, reason: "missing_telnyx_or_phone" as const };
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
  await telnyx.messages.send({
    from: telnyxConfig.fromNumber,
    to: params.client.phone,
    text: message,
  });

  return { sent: true as const };
}
