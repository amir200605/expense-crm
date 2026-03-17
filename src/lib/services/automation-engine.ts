import { prisma } from "@/lib/db";
import type { AutomationTrigger, LeadDisposition, PipelineStage } from "@prisma/client";
import Telnyx from "telnyx";
import nodemailer from "nodemailer";

interface ActionNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface TriggerContext {
  agencyId: string;
  userId: string;
  leadId?: string;
  clientId?: string;
  appointmentId?: string;
  policyId?: string;
  oldValue?: string;
  newValue?: string;
  /** When set, SEND_EMAIL sends to this address (for testing) */
  testEmail?: string;
}

interface IntegrationsConfig {
  telnyx?: { apiKey?: string; fromNumber?: string };
  outlook?: { fromEmail?: string; smtpUser?: string; smtpPass?: string };
}

export async function fireAutomationTrigger(
  triggerType: AutomationTrigger,
  context: TriggerContext
) {
  const automations = await prisma.automation.findMany({
    where: {
      agencyId: context.agencyId,
      trigger: triggerType,
      enabled: true,
    },
  });

  for (const automation of automations) {
    const actions = automation.actions as unknown as ActionNode[];
    if (!actions || actions.length === 0) continue;

    const agency = await prisma.agency.findUnique({
      where: { id: context.agencyId },
      select: { settings: true },
    });
    const integrations: IntegrationsConfig = ((agency?.settings as Record<string, unknown>)?.integrations as IntegrationsConfig) ?? {};

    const run = await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        userId: context.userId,
        triggerEntityId: context.leadId ?? context.appointmentId ?? context.policyId ?? null,
        status: "running",
        steps: [],
      },
    });

    const stepResults: { actionId: string; type: string; status: string; detail?: string }[] = [];

    for (const action of actions) {
      try {
        await executeAction(action, context, integrations);
        stepResults.push({ actionId: action.id, type: action.type, status: "completed" });
      } catch (err) {
        stepResults.push({
          actionId: action.id,
          type: action.type,
          status: "failed",
          detail: err instanceof Error ? err.message : "Unknown error",
        });
        break;
      }
    }

    const finalStatus = stepResults.some((s) => s.status === "failed") ? "failed" : "completed";
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: finalStatus, completedAt: new Date(), steps: stepResults },
    });
  }
}

export type TestRunResult = {
  runId: string;
  status: string;
  steps: { actionId: string; type: string; status: string; detail?: string }[];
  error?: string;
};

/** Run a single automation once with the given context (for testing). */
export async function runAutomationForTest(
  automationId: string,
  context: TriggerContext
): Promise<TestRunResult> {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation || automation.agencyId !== context.agencyId) {
    throw new Error("Automation not found");
  }
  const actions = automation.actions as unknown as ActionNode[];
  if (!actions || actions.length === 0) {
    throw new Error("No actions in workflow");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: context.agencyId },
    select: { settings: true },
  });
  const integrations: IntegrationsConfig = ((agency?.settings as Record<string, unknown>)?.integrations as IntegrationsConfig) ?? {};

  const run = await prisma.automationRun.create({
    data: {
      automationId,
      userId: context.userId,
      triggerEntityId: context.leadId ?? null,
      status: "running",
      steps: [],
    },
  });

  const stepResults: { actionId: string; type: string; status: string; detail?: string }[] = [];

  for (const action of actions) {
    try {
      await executeAction(action, context, integrations);
      stepResults.push({ actionId: action.id, type: action.type, status: "completed" });
    } catch (err) {
      stepResults.push({
        actionId: action.id,
        type: action.type,
        status: "failed",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
      const finalStatus = "failed";
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: finalStatus, completedAt: new Date(), steps: stepResults },
      });
      return { runId: run.id, status: finalStatus, steps: stepResults, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  const finalStatus = "completed";
  await prisma.automationRun.update({
    where: { id: run.id },
    data: { status: finalStatus, completedAt: new Date(), steps: stepResults },
  });
  return { runId: run.id, status: finalStatus, steps: stepResults };
}

async function executeAction(action: ActionNode, ctx: TriggerContext, integrations: IntegrationsConfig = {}) {
  const c = action.config;

  switch (action.type) {
    case "CREATE_TASK": {
      const dueInDays = (c.dueInDays as number) ?? 1;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);
      await prisma.task.create({
        data: {
          title: (c.title as string) || "Automated task",
          dueDate,
          assignedToId: ctx.userId,
          relatedLeadId: ctx.leadId ?? null,
          relatedClientId: ctx.clientId ?? null,
          type: "FOLLOW_UP",
        },
      });
      break;
    }

    case "ADD_TAG": {
      if (!ctx.leadId || !c.tag) break;
      const tagName = c.tag as string;
      let tag = await prisma.tag.findFirst({
        where: { name: tagName, agencyId: ctx.agencyId },
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: tagName, agencyId: ctx.agencyId },
        });
      }
      const existing = await prisma.leadTag.findFirst({
        where: { leadId: ctx.leadId, tagId: tag.id },
      });
      if (!existing) {
        await prisma.leadTag.create({
          data: { leadId: ctx.leadId, tagId: tag.id },
        });
      }
      break;
    }

    case "CHANGE_STAGE": {
      if (!ctx.leadId || !c.stage) break;
      await prisma.lead.update({
        where: { id: ctx.leadId },
        data: { pipelineStage: c.stage as PipelineStage },
      });
      break;
    }

    case "CHANGE_DISPOSITION": {
      if (!ctx.leadId || !c.disposition) break;
      await prisma.lead.update({
        where: { id: ctx.leadId },
        data: { disposition: c.disposition as LeadDisposition },
      });
      break;
    }

    case "ASSIGN_AGENT": {
      if (!ctx.leadId) break;
      const rule = (c.rule as string) ?? "round_robin";
      if (rule === "round_robin" || rule === "least_leads") {
        const agents = await prisma.user.findMany({
          where: { agencyId: ctx.agencyId, role: "AGENT" },
          include: { _count: { select: { leadsAssignedAsAgent: true } } },
        });
        if (agents.length === 0) break;
        const sorted = [...agents].sort((a, b) => a._count.leadsAssignedAsAgent - b._count.leadsAssignedAsAgent);
        await prisma.lead.update({
          where: { id: ctx.leadId },
          data: { assignedAgentId: sorted[0].id },
        });
      }
      break;
    }

    case "SET_NEXT_FOLLOW_UP": {
      if (!ctx.leadId) break;
      const days = (c.daysFromNow as number) ?? 1;
      const date = new Date();
      date.setDate(date.getDate() + days);
      date.setHours(9, 0, 0, 0);
      await prisma.lead.update({
        where: { id: ctx.leadId },
        data: { nextFollowUpAt: date },
      });
      break;
    }

    case "ADD_NOTE": {
      if (!ctx.leadId) break;
      const noteContent = (c.note as string)?.trim() || "Automation note";
      await prisma.note.create({
        data: {
          content: noteContent,
          authorId: ctx.userId,
          relatedLeadId: ctx.leadId,
        },
      });
      break;
    }

    case "NOTIFY_AGENT": {
      if (!ctx.leadId) break;
      const lead = await prisma.lead.findUnique({
        where: { id: ctx.leadId },
        select: { fullName: true, firstName: true, lastName: true, assignedAgentId: true, assignedManagerId: true, agencyId: true },
      });
      if (!lead) break;
      const msg = (c.message as string)?.trim() || "This lead needs your attention.";
      const notifyTo = (c.sendTo as string) ?? "assigned_agent";
      let emailTo: string | null = null;
      if (notifyTo === "assigned_agent" && lead.assignedAgentId) {
        const u = await prisma.user.findUnique({ where: { id: lead.assignedAgentId }, select: { email: true } });
        if (u?.email) emailTo = u.email;
      } else if (notifyTo === "manager" && lead.assignedManagerId) {
        const u = await prisma.user.findUnique({ where: { id: lead.assignedManagerId }, select: { email: true } });
        if (u?.email) emailTo = u.email;
      } else if (notifyTo === "agency_owner") {
        const owner = await prisma.user.findFirst({
          where: { agencyId: lead.agencyId, role: "AGENCY_OWNER" },
          select: { email: true },
        });
        if (owner?.email) emailTo = owner.email;
      } else if (notifyTo === "custom") {
        emailTo = (c.customEmail as string) || null;
      }
      const outlookConfig = integrations.outlook;
      const name = lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";
      if (emailTo && outlookConfig?.smtpUser && outlookConfig?.smtpPass && outlookConfig?.fromEmail) {
        const transporter = nodemailer.createTransport({
          host: "smtp.office365.com",
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: outlookConfig.smtpUser, pass: outlookConfig.smtpPass },
        });
        await transporter.sendMail({
          from: outlookConfig.fromEmail,
          to: emailTo,
          subject: `ExpenseFlow: ${name} – action needed`,
          text: `${msg}\n\nLead: ${name}\nView in CRM to follow up.`,
        });
      }
      break;
    }

    case "WAIT": {
      const duration = (c.duration as number) ?? 1;
      const unit = (c.unit as string) ?? "days";
      let ms = duration * 1000;
      if (unit === "minutes") ms = duration * 60 * 1000;
      else if (unit === "hours") ms = duration * 3600 * 1000;
      else ms = duration * 86400 * 1000;
      // Cap wait to 5 seconds in execution for safety
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5000)));
      break;
    }

    case "SEND_SMS": {
      let smsTo: string | null = null;
      const sendTo = (c.sendTo as string) ?? "lead_phone";
      if (sendTo === "custom") {
        smsTo = (c.customPhone as string) || null;
      } else if (ctx.leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: ctx.leadId },
          select: { phone: true, client: { select: { phone: true } } },
        });
        if (sendTo === "lead_phone" && lead?.phone) smsTo = lead.phone;
        else if (sendTo === "client_phone" && lead?.client?.phone) {
          smsTo = lead.client.phone;
        }
      }
      const message = (c.message as string) ?? "";
      if (smsTo && message) {
        const telnyxConfig = integrations.telnyx;
        if (telnyxConfig?.apiKey && telnyxConfig?.fromNumber) {
          const client = new Telnyx({ apiKey: telnyxConfig.apiKey });
          await client.messages.send({
            from: telnyxConfig.fromNumber,
            to: smsTo,
            text: message,
          });
        }
      }
      if (ctx.leadId) {
        await prisma.activityLog.create({
          data: {
            userId: ctx.userId,
            action: "SMS_SENT",
            entityType: "Lead",
            entityId: ctx.leadId,
            newValue: { to: smsTo ?? undefined, message, sendTo, sent: !!integrations.telnyx?.apiKey },
          },
        });
      }
      break;
    }

    case "SEND_EMAIL": {
      let emailTo: string | null = null;
      if (ctx.testEmail) {
        emailTo = ctx.testEmail;
      } else {
        const sendTo = (c.sendTo as string) ?? "lead_email";
        if (sendTo === "custom") {
          emailTo = (c.customEmail as string) || null;
        } else if (ctx.leadId) {
          const lead = await prisma.lead.findUnique({
            where: { id: ctx.leadId },
            select: { email: true, client: { select: { email: true } }, assignedAgentId: true },
          });
          if (sendTo === "lead_email" && lead?.email) emailTo = lead.email;
          else if (sendTo === "client_email" && lead?.client?.email) emailTo = lead.client.email;
          else if (sendTo === "assigned_agent" && lead?.assignedAgentId) {
            const agent = await prisma.user.findUnique({ where: { id: lead.assignedAgentId }, select: { email: true } });
            if (agent?.email) emailTo = agent.email;
          }
        }
      }
      const subject = (c.subject as string) ?? "";
      const body = (c.body as string) ?? "";
      if (emailTo && (subject || body)) {
        const outlookConfig = integrations.outlook;
        if (outlookConfig?.smtpUser && outlookConfig?.smtpPass && outlookConfig?.fromEmail) {
          const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
              user: outlookConfig.smtpUser,
              pass: outlookConfig.smtpPass,
            },
          });
          await transporter.sendMail({
            from: outlookConfig.fromEmail,
            to: emailTo,
            subject: subject || "(No subject)",
            text: body,
          });
        }
      }
      if (ctx.leadId) {
        await prisma.activityLog.create({
          data: {
            userId: ctx.userId,
            action: "EMAIL_SENT",
            entityType: "Lead",
            entityId: ctx.leadId,
            newValue: { to: emailTo ?? undefined, subject, body, sendTo: (c.sendTo as string) ?? "lead_email", sent: !!(integrations.outlook?.smtpUser && integrations.outlook?.smtpPass) },
          },
        });
      }
      break;
    }

    default:
      break;
  }
}
