export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  actions: { id: string; type: string; config: Record<string, unknown> }[];
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "new-lead-followup",
    name: "New Lead Follow-Up",
    description: "When a new lead is created, create a follow-up task and tag the lead as 'new'.",
    trigger: "LEAD_CREATED",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "ADD_TAG", config: { tag: "new-lead" } },
      { id: "a2", type: "CREATE_TASK", config: { title: "Follow up with new lead", dueInDays: 1 } },
    ],
  },
  {
    id: "auto-assign-round-robin",
    name: "Auto-Assign (Round Robin)",
    description: "Automatically assign new leads to agents using round-robin distribution.",
    trigger: "LEAD_CREATED",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "ASSIGN_AGENT", config: { rule: "round_robin" } },
    ],
  },
  {
    id: "new-lead-notify-admin",
    name: "New Lead → Notify Admin",
    description: "When a new lead is submitted (e.g. from the website interest form), email the agency owner.",
    trigger: "LEAD_CREATED",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "NOTIFY_AGENT", config: { sendTo: "agency_owner", message: "A new lead just came in from the website. Check your CRM to follow up." } },
    ],
  },
  {
    id: "no-contact-reminder",
    name: "No Contact Reminder",
    description: "If a lead hasn't been contacted in 3 days, create an urgent follow-up task.",
    trigger: "NO_CONTACT_DAYS",
    triggerConfig: { days: 3 },
    actions: [
      { id: "a1", type: "CREATE_TASK", config: { title: "URGENT: Follow up - no contact in 3 days", dueInDays: 0 } },
      { id: "a2", type: "ADD_TAG", config: { tag: "needs-attention" } },
    ],
  },
  {
    id: "appointment-set-pipeline",
    name: "Appointment Set Pipeline",
    description: "When an appointment is set, move the lead to the Appointment Set stage.",
    trigger: "APPOINTMENT_SET",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "CHANGE_STAGE", config: { stage: "APPOINTMENT_SET" } },
      { id: "a2", type: "CHANGE_DISPOSITION", config: { disposition: "APPOINTMENT_SET" } },
    ],
  },
  {
    id: "policy-approved-celebration",
    name: "Policy Approved Workflow",
    description: "When a policy is approved, change the lead to Sold and create a welcome task.",
    trigger: "POLICY_APPROVED",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "CHANGE_DISPOSITION", config: { disposition: "SOLD" } },
      { id: "a2", type: "CHANGE_STAGE", config: { stage: "PLACED" } },
      { id: "a3", type: "CREATE_TASK", config: { title: "Send welcome packet to client", dueInDays: 2 } },
      { id: "a4", type: "ADD_TAG", config: { tag: "sold" } },
    ],
  },
  {
    id: "no-contact-set-followup",
    name: "No Contact: Set Follow-Up & Notify",
    description: "When no contact in 3 days, set next follow-up date, add a note, and notify the assigned agent.",
    trigger: "NO_CONTACT_DAYS",
    triggerConfig: { days: 3 },
    actions: [
      { id: "a1", type: "SET_NEXT_FOLLOW_UP", config: { daysFromNow: 1 } },
      { id: "a2", type: "ADD_NOTE", config: { note: "Automation: no contact in 3 days – follow-up scheduled." } },
      { id: "a3", type: "CREATE_TASK", config: { title: "Follow up – no contact", dueInDays: 0 } },
      { id: "a4", type: "NOTIFY_AGENT", config: { sendTo: "assigned_agent", message: "This lead has had no contact in 3 days. Please follow up." } },
    ],
  },
  {
    id: "appointment-missed-recovery",
    name: "Appointment Missed: Re-engage",
    description: "When an appointment is missed, set a follow-up date, add a note, and create a task to rebook.",
    trigger: "APPOINTMENT_MISSED",
    triggerConfig: {},
    actions: [
      { id: "a1", type: "SET_NEXT_FOLLOW_UP", config: { daysFromNow: 1 } },
      { id: "a2", type: "ADD_NOTE", config: { note: "Automation: appointment missed – re-engagement scheduled." } },
      { id: "a3", type: "CREATE_TASK", config: { title: "Rebook – appointment missed", dueInDays: 1 } },
      { id: "a4", type: "ADD_TAG", config: { tag: "no-show" } },
    ],
  },
];
