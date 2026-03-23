import { prisma } from "@/lib/db";
import { writeAgentCardToPublicUrl } from "@/lib/agent-card-image";
import { resolvePublicAppBaseUrl } from "@/lib/public-app-url";
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
    const appBaseUrl = resolvePublicAppBaseUrl(params.appBaseUrl ?? undefined);

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
    type SenderCard = {
      name: string | null;
      username: string | null;
      role: string;
      npnNumber: string | null;
      phone: string | null;
      avatarUrl: string | null;
      cardImageUrl: string | null;
    } | null;
    let senderForCard: SenderCard = null;

    if (params.userId) {
      try {
        const [agency, sender] = await Promise.all([
          prisma.agency.findUnique({
            where: { id: params.agencyId },
            select: { name: true },
          }),
          prisma.user.findUnique({
            where: { id: params.userId },
            select: {
              name: true,
              username: true,
              role: true,
              npnNumber: true,
              phone: true,
              avatarUrl: true,
              cardImageUrl: true,
            },
          }),
        ]);
        senderForCard = sender;

        if (sender && appBaseUrl.trim()) {
          try {
            const generated = await writeAgentCardToPublicUrl({
              userId: params.userId,
              agencyName: agency?.name ?? "Prime Insurance Agency",
              name: sender.name ?? params.userName ?? "Agent",
              username: sender.username,
              role: sender.role,
              npnNumber: sender.npnNumber,
              phone: sender.phone,
              avatarUrl: sender.avatarUrl,
              appBaseUrl,
            });
            if (generated) agentCardImageUrl = generated;
          } catch (genErr) {
            console.warn("[welcome-sms] agent card PNG generation failed:", genErr);
          }
        }
      } catch (loadErr) {
        console.warn("[welcome-sms] could not load sender/agency for card:", loadErr);
      }
    }

    if (!agentCardImageUrl && senderForCard) {
      const rawCardUrl = senderForCard.cardImageUrl?.trim() ?? "";
      const rawAvatarUrl = senderForCard.avatarUrl?.trim() ?? "";
      const preferredImageUrl = rawCardUrl || rawAvatarUrl;
      agentCardImageUrl =
        preferredImageUrl && preferredImageUrl.startsWith("/")
          ? (appBaseUrl ? `${appBaseUrl}${preferredImageUrl}` : null)
          : preferredImageUrl || null;
    }

    if (!agentCardImageUrl && params.userId) {
      const hint =
        appBaseUrl.includes("localhost") || appBaseUrl.includes("127.0.0.1")
          ? " Telnyx cannot fetch images from localhost — set PUBLIC_APP_URL to your public HTTPS URL (or use a tunnel)."
          : "";
      console.warn(`[welcome-sms] no agent card image URL for MMS (user ${params.userId}).${hint}`);
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
