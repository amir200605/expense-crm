"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validations/lead";

interface TeamMember {
  id: string;
  name: string | null;
  username: string | null;
  role: string;
}

async function createLeadApi(data: CreateLeadInput) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      error?: string;
      details?: unknown;
    };
    const detail =
      err.details != null
        ? ` ${typeof err.details === "string" ? err.details : JSON.stringify(err.details)}`
        : "";
    throw new Error((err.error ?? "Failed to create lead") + detail);
  }
  return res.json();
}

async function updateLeadApi(id: string, data: CreateLeadInput) {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; details?: unknown };
    const detail =
      err.details != null
        ? ` ${typeof err.details === "string" ? err.details : JSON.stringify(err.details)}`
        : "";
    throw new Error((err.error ?? "Failed to update lead") + detail);
  }
  return res.json();
}

async function fetchLeadForEdit(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/leads/${id}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Failed to load lead for edit");
  return res.json();
}

function toDateInput(v: unknown): string {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function buildFormValuesFromLead(data: Record<string, unknown>): CreateLeadInput {
  const defaults = getEmptyLeadValues() as Record<string, unknown>;
  const raw = (data.rawPayload && typeof data.rawPayload === "object" ? data.rawPayload : {}) as Record<string, unknown>;
  const merged = { ...raw, ...data };
  const next: Record<string, unknown> = { ...defaults };
  Object.keys(defaults).forEach((k) => {
    const val = merged[k];
    if (val === null || val === undefined) return;
    next[k] = val;
  });
  next.address = (merged.address as string | undefined) ?? (merged.address1 as string | undefined) ?? "";
  next.bestTimeToCall = (merged.bestTimeToCall as string | undefined) ?? (merged.bestCallTime as string | undefined) ?? "";
  next.tobaccoStatus = (merged.tobaccoStatus as string | undefined) ?? (merged.smokerStatus as string | undefined) ?? "";
  next.dateOfBirth = toDateInput(merged.dateOfBirth);
  next.dateLeadReceived = toDateInput(merged.dateLeadReceived);
  next.applicationDate = toDateInput(merged.applicationDate);
  next.effectiveDate = toDateInput(merged.effectiveDate);
  next.approvalDate = toDateInput(merged.approvalDate);
  next.draftDate = toDateInput(merged.draftDate);
  return next as CreateLeadInput;
}

async function fetchTeam(): Promise<{ members: TeamMember[] }> {
  const res = await fetch("/api/team");
  if (!res.ok) return { members: [] };
  return res.json();
}

/** All fields used in the form must have defined defaults so inputs stay controlled. */
function getEmptyLeadValues(): CreateLeadInput {
  return {
    firstName: "",
    lastName: "",
    fullName: "",
    phone: "",
    phone2: "",
    email: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    maritalStatus: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    county: "",
    timeZone: "",
    preferredContactMethod: "",
    bestTimeToCall: "",
    source: "",
    vendor: "",
    campaign: "",
    leadCost: "",
    dateLeadReceived: "",
    leadType: "",
    leadFreshness: "",
    disposition: "NEW",
    spouseName: "",
    beneficiaryName: "",
    beneficiaryRelation: "",
    beneficiaryPhone: "",
    emergencyContact: "",
    childrenYesNo: "",
    grandchildrenYesNo: "",
    decisionMakerNotes: "",
    coverageAmountInterest: "",
    budgetMonthlyPremiumTarget: "",
    burialOrCremationPreference: "",
    existingLifeInsuranceYesNo: "",
    existingPolicyAmount: "",
    concernReasonForBuying: "",
    wantsFuneralPlanningHelpYesNo: "",
    preferredPaymentMode: "",
    height: "",
    weight: "",
    tobaccoStatus: "",
    prescriptionMedications: "",
    majorConditions: "",
    hospitalizationsLast2Years: "",
    cancerHistory: "",
    heartHistory: "",
    diabetes: "",
    copdOxygenUse: "",
    strokeHistory: "",
    kidneyDisease: "",
    mobilityIssues: "",
    mentalCapacityConcerns: "",
    nursingHomeAssistedLivingStatus: "",
    recentSurgeries: "",
    underwritingClassEstimatedEligibility: "",
    knockoutConditionYesNo: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    socialSecurityOrLast4: "",
    draftDate: "",
    incomeSource: "",
    beneficiaryPayorIfDifferent: "",
    paymentMethod: "",
    replacementInvolvedYesNo: "",
    carrierQuoted: "",
    planProduct: "",
    faceAmount: "",
    premium: "",
    applicationDate: "",
    applicationStatus: "",
    policyNumber: "",
    writingAgent: "",
    splitAgent: "",
    effectiveDate: "",
    approvalDate: "",
    declineReason: "",
    chargebackRisk: "",
    persistencyNotes: "",
    doNotCall: false,
    notes: "",
    assignedAgentId: "",
  };
}

function toCreateLeadPayload(values: CreateLeadInput): CreateLeadInput {
  const next: Record<string, unknown> = {};
  Object.entries(values as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === "string") {
      const trimmed = v.trim();
      next[k] = trimmed === "" ? undefined : trimmed;
      return;
    }
    next[k] = v;
  });
  return next as CreateLeadInput;
}

export function LeadFormSheet({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
}) {
  const queryClient = useQueryClient();
  const defaultLeadValues = useMemo(() => getEmptyLeadValues(), []);
  const form = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: defaultLeadValues,
  });

  const { data: leadEditData } = useQuery({
    queryKey: ["lead-edit", leadId],
    queryFn: () => fetchLeadForEdit(leadId!),
    enabled: open && Boolean(leadId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!open) return;
    if (leadId && leadEditData) {
      form.reset(buildFormValuesFromLead(leadEditData));
      return;
    }
    form.reset(defaultLeadValues);
  }, [open, leadId, leadEditData, form, defaultLeadValues]);

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 60_000,
  });

  const agents = (teamData?.members ?? []).filter(
    (m) => m.role === "AGENT" || m.role === "MANAGER" || m.role === "AGENCY_OWNER"
  );

  const mutation = useMutation({
    mutationFn: (payload: CreateLeadInput) =>
      leadId ? updateLeadApi(leadId, payload) : createLeadApi(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (leadId) queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      form.reset(defaultLeadValues);
      onOpenChange(false);
      if (!leadId && data.lead?.id) {
        window.location.href = `/leads/${data.lead.id}`;
      }
    },
  });

  function onSubmit(values: CreateLeadInput) {
    mutation.mutate(toCreateLeadPayload(values));
  }

  type FieldCfg = { name: keyof CreateLeadInput; label: string; type?: "text" | "email" | "date" | "number" };
  const fieldOptions: Partial<Record<keyof CreateLeadInput, string[]>> = {
    gender: ["Male", "Female", "Other"],
    maritalStatus: ["Single", "Married", "Divorced", "Widowed", "Separated"],
    preferredContactMethod: ["Phone", "SMS", "Email"],
    bestTimeToCall: ["Morning", "Afternoon", "Evening", "Anytime"],
    leadType: ["Inbound", "Aged", "Live transfer", "Direct mail", "Referral", "Other"],
    leadFreshness: ["Hot", "Warm", "Cold", "Aged"],
    childrenYesNo: ["Yes", "No"],
    grandchildrenYesNo: ["Yes", "No"],
    existingLifeInsuranceYesNo: ["Yes", "No"],
    wantsFuneralPlanningHelpYesNo: ["Yes", "No"],
    knockoutConditionYesNo: ["Yes", "No"],
    replacementInvolvedYesNo: ["Yes", "No"],
    burialOrCremationPreference: ["Burial", "Cremation", "Undecided"],
    preferredPaymentMode: ["Monthly", "Bank draft", "Direct Express", "Quarterly", "Annual"],
    tobaccoStatus: ["Non-tobacco", "Tobacco", "Former"],
    diabetes: ["Yes", "No"],
    cancerHistory: ["Yes", "No"],
    heartHistory: ["Yes", "No"],
    copdOxygenUse: ["Yes", "No"],
    strokeHistory: ["Yes", "No"],
    kidneyDisease: ["Yes", "No"],
    mobilityIssues: ["Yes", "No"],
    mentalCapacityConcerns: ["Yes", "No"],
    nursingHomeAssistedLivingStatus: ["Yes", "No"],
    chargebackRisk: ["Low", "Medium", "High"],
    applicationStatus: ["Draft", "Submitted", "Pending", "Approved", "Declined"],
  };
  const clientInfoFields: FieldCfg[] = [
    { name: "firstName", label: "First name" },
    { name: "lastName", label: "Last name" },
    { name: "fullName", label: "Full name" },
    { name: "phone", label: "Phone 1" },
    { name: "phone2", label: "Phone 2" },
    { name: "email", label: "Email", type: "email" },
    { name: "dateOfBirth", label: "Date of birth", type: "date" },
    { name: "age", label: "Age", type: "number" },
    { name: "gender", label: "Gender" },
    { name: "maritalStatus", label: "Marital status" },
    { name: "address", label: "Address" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "zip", label: "ZIP" },
    { name: "county", label: "County" },
    { name: "timeZone", label: "Time zone" },
    { name: "preferredContactMethod", label: "Preferred contact method" },
    { name: "bestTimeToCall", label: "Best time to call" },
  ];
  const leadSourceFields: FieldCfg[] = [
    { name: "source", label: "Lead source" },
    { name: "vendor", label: "Lead vendor" },
    { name: "campaign", label: "Campaign name" },
    { name: "leadCost", label: "Lead cost", type: "number" },
    { name: "dateLeadReceived", label: "Date lead received", type: "date" },
    { name: "leadType", label: "Lead type" },
    { name: "leadFreshness", label: "Lead freshness" },
  ];
  const personalFamilyFields: FieldCfg[] = [
    { name: "spouseName", label: "Spouse name" },
    { name: "beneficiaryName", label: "Beneficiary name" },
    { name: "beneficiaryRelation", label: "Beneficiary relationship" },
    { name: "beneficiaryPhone", label: "Beneficiary phone" },
    { name: "emergencyContact", label: "Emergency contact" },
    { name: "childrenYesNo", label: "Children yes/no" },
    { name: "grandchildrenYesNo", label: "Grandchildren yes/no" },
  ];
  const finalExpenseNeedsFields: FieldCfg[] = [
    { name: "coverageAmountInterest", label: "Coverage amount wanted", type: "number" },
    { name: "budgetMonthlyPremiumTarget", label: "Budget/monthly premium target" },
    { name: "burialOrCremationPreference", label: "Burial or cremation preference" },
    { name: "existingLifeInsuranceYesNo", label: "Existing life insurance yes/no" },
    { name: "existingPolicyAmount", label: "Existing policy amount" },
    { name: "wantsFuneralPlanningHelpYesNo", label: "Wants funeral planning help yes/no" },
    { name: "preferredPaymentMode", label: "Preferred payment mode" },
  ];
  const healthUnderwritingFields: FieldCfg[] = [
    { name: "height", label: "Height" },
    { name: "weight", label: "Weight" },
    { name: "tobaccoStatus", label: "Tobacco status" },
    { name: "hospitalizationsLast2Years", label: "Hospitalizations in last 2 years" },
    { name: "cancerHistory", label: "Cancer history" },
    { name: "heartHistory", label: "Heart history" },
    { name: "diabetes", label: "Diabetes" },
    { name: "copdOxygenUse", label: "COPD/oxygen use" },
    { name: "strokeHistory", label: "Stroke history" },
    { name: "kidneyDisease", label: "Kidney disease" },
    { name: "mobilityIssues", label: "Mobility issues" },
    { name: "mentalCapacityConcerns", label: "Mental capacity concerns" },
    { name: "nursingHomeAssistedLivingStatus", label: "Nursing home / assisted living status" },
    { name: "underwritingClassEstimatedEligibility", label: "Underwriting class / estimated eligibility" },
    { name: "knockoutConditionYesNo", label: "Knockout condition yes/no" },
  ];
  const financialPaymentFields: FieldCfg[] = [
    { name: "bankName", label: "Bank name" },
    { name: "routingNumber", label: "Routing number" },
    { name: "accountNumber", label: "Account number" },
    { name: "socialSecurityOrLast4", label: "Social Security number or last 4" },
    { name: "draftDate", label: "Draft date", type: "date" },
    { name: "incomeSource", label: "Income source" },
    { name: "beneficiaryPayorIfDifferent", label: "Beneficiary payor if different" },
    { name: "paymentMethod", label: "Payment method" },
    { name: "replacementInvolvedYesNo", label: "Replacement involved yes/no" },
  ];
  const policyApplicationFields: FieldCfg[] = [
    { name: "planProduct", label: "Plan/product" },
    { name: "faceAmount", label: "Face amount" },
    { name: "premium", label: "Premium" },
    { name: "applicationDate", label: "Application date", type: "date" },
    { name: "applicationStatus", label: "Application status" },
    { name: "policyNumber", label: "Policy number" },
    { name: "writingAgent", label: "Writing agent" },
    { name: "splitAgent", label: "Split agent" },
    { name: "effectiveDate", label: "Effective date", type: "date" },
    { name: "approvalDate", label: "Approval date", type: "date" },
    { name: "declineReason", label: "Decline reason" },
    { name: "chargebackRisk", label: "Chargeback risk" },
  ];
  const carrierOptions = [
    "Aetna-866-272-6630",
    "Aflac-866-272-6630 (Option 1)",
    "AIG (Corebridge) 800-255-2702",
    "American Amicable-800-736-7311",
    "Americo 800-231-0801",
    "CICA 737-289-4670",
    "Ethos 415-498-1734",
    "Fidelity & Guarantee Life (F&G) 800-445-6758",
    "InstaBrain 1-800-806-9714",
    "Mutual of Omaha 800-775-7896",
    "TransAmerica 877-234-4848",
  ];

  function renderTextGrid(fields: FieldCfg[]) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((cfg) => (
          <FormField
            key={cfg.name}
            control={form.control}
            name={cfg.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{cfg.label}</FormLabel>
                {fieldOptions[cfg.name] ? (
                  <Select
                    value={(field.value as string | undefined) ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${cfg.label.toLowerCase()}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {fieldOptions[cfg.name]!.map((opt) => (
                        <SelectItem key={`${cfg.name}-${opt}`} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      type={cfg.type ?? "text"}
                      value={(field.value as string | number | undefined) ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{leadId ? "Edit lead" : "Add lead"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">1. Client information</h3>
              {renderTextGrid(clientInfoFields)}
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">2. Lead source fields</h3>
              {renderTextGrid(leadSourceFields)}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="assignedAgentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned agent</FormLabel>
                      <Select
                        value={field.value ?? "unassigned"}
                        onValueChange={(v) => field.onChange(v === "unassigned" ? undefined : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {agents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name ?? a.username ?? a.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disposition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition status</FormLabel>
                      <Select value={field.value ?? "NEW"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEW">NEW</SelectItem>
                          <SelectItem value="ATTEMPTING_CONTACT">ATTEMPTING CONTACT</SelectItem>
                          <SelectItem value="CONTACTED">CONTACTED</SelectItem>
                          <SelectItem value="INTERESTED">INTERESTED</SelectItem>
                          <SelectItem value="APPOINTMENT_SET">APPOINTMENT SET</SelectItem>
                          <SelectItem value="PRESENTED">PRESENTED</SelectItem>
                          <SelectItem value="APPLICATION_SENT">APPLICATION SENT</SelectItem>
                          <SelectItem value="SOLD">SOLD</SelectItem>
                          <SelectItem value="NOT_INTERESTED">NOT INTERESTED</SelectItem>
                          <SelectItem value="BAD_LEAD">BAD LEAD</SelectItem>
                          <SelectItem value="DNC">DNC</SelectItem>
                          <SelectItem value="RECYCLE">RECYCLE</SelectItem>
                          <SelectItem value="FOLLOW_UP_LATER">FOLLOW UP LATER</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">4. Personal/family fields</h3>
              {renderTextGrid(personalFamilyFields)}
              <FormField
                control={form.control}
                name="decisionMakerNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision maker notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">5. Final expense needs fields</h3>
              {renderTextGrid(finalExpenseNeedsFields)}
              <FormField
                control={form.control}
                name="concernReasonForBuying"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concern/reason for buying</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">6. Health underwriting fields</h3>
              {renderTextGrid(healthUnderwritingFields)}
              <FormField
                control={form.control}
                name="prescriptionMedications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescription medications</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="majorConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Major conditions</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recentSurgeries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recent surgeries</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">7. Financial/payment fields</h3>
              {renderTextGrid(financialPaymentFields)}
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">8. Policy/application fields</h3>
              <FormField
                control={form.control}
                name="carrierQuoted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier quoted</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carrierOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderTextGrid(policyApplicationFields)}
              <FormField
                control={form.control}
                name="persistencyNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persistency notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold">General notes</h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">{mutation.error.message}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (leadId ? "Saving…" : "Creating…") : leadId ? "Save changes" : "Create lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
