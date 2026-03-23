import { prisma } from "@/lib/db";
import { sendClientWelcomeSms, type SendClientWelcomeSmsResult } from "@/lib/services/client-welcome-sms";

export type WelcomeSmsRunResult =
  | SendClientWelcomeSmsResult
  | { sent: false; reason: "exception"; detail: string };

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
}): Promise<WelcomeSmsRunResult> {
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

    let agentCardImageUrl: string | null = null;
    if (params.userId) {
      try {
        const sender = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { cardImageUrl: true, avatarUrl: true },
        });
        const rawCardUrl = sender?.cardImageUrl?.trim() ?? "";
        const rawAvatarUrl = sender?.avatarUrl?.trim() ?? "";
        const preferredImageUrl = rawCardUrl || rawAvatarUrl;
        agentCardImageUrl =
          preferredImageUrl && preferredImageUrl.startsWith("/")
            ? (params.appBaseUrl ? `${params.appBaseUrl}${preferredImageUrl}` : null)
            : preferredImageUrl || null;
      } catch (cardErr) {
        console.warn("[welcome-sms] could not load agent card image (run migration or ignore):", cardErr);
      }
    }

    return await sendClientWelcomeSms({
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
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[welcome-sms] send failed:", e);
    return { sent: false, reason: "exception", detail };
  }
}
