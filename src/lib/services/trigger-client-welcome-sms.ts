import { prisma } from "@/lib/db";
import { sendClientWelcomeSms } from "@/lib/services/client-welcome-sms";

/**
 * After a client is created (API or lead conversion), send welcome SMS if Telnyx is configured
 * and optionally log SMS on the linked lead for Communications tab.
 */
export async function runClientWelcomeSmsAfterCreate(params: {
  agencyId: string;
  appBaseUrl?: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    carrier: string | null;
    premiumAmount: string | number | { toString: () => string } | null | undefined;
  };
  linkedLeadId: string | null | undefined;
  userId: string | null | undefined;
  userName: string | null;
  userEmail: string | null;
}) {
  try {
    const latestPolicy = await prisma.policy.findFirst({
      where: { clientId: params.client.id },
      orderBy: { createdAt: "desc" },
      select: {
        carrier: true,
        policyNumber: true,
        faceAmount: true,
        premium: true,
        paymentDraftDate: true,
      },
    });
    const sender = params.userId
      ? await prisma.user.findUnique({
          where: { id: params.userId },
          select: { cardImageUrl: true },
        })
      : null;
    const rawCardUrl = sender?.cardImageUrl?.trim() ?? "";
    const agentCardImageUrl =
      rawCardUrl && rawCardUrl.startsWith("/")
        ? (params.appBaseUrl ? `${params.appBaseUrl}${rawCardUrl}` : null)
        : rawCardUrl || null;
    await sendClientWelcomeSms({
      agencyId: params.agencyId,
      client: {
        firstName: params.client.firstName,
        lastName: params.client.lastName,
        phone: params.client.phone,
        carrier: params.client.carrier,
        premiumAmount: params.client.premiumAmount,
      },
      policy: latestPolicy,
      agentName: params.userName ?? params.userEmail ?? "your life insurance agent",
      agentCardImageUrl,
      logToLead: params.linkedLeadId
        ? { leadId: params.linkedLeadId, userId: params.userId ?? null }
        : undefined,
    });
  } catch (e) {
    console.error("[welcome-sms] send failed:", e);
  }
}
