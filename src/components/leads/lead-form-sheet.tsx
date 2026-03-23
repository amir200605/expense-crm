"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const defaultLeadValues = useMemo(() => getEmptyLeadValues(), []);
  const form = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: defaultLeadValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultLeadValues);
    }
  }, [open, form, defaultLeadValues]);

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 60_000,
  });

  const agents = (teamData?.members ?? []).filter(
    (m) => m.role === "AGENT" || m.role === "MANAGER" || m.role === "AGENCY_OWNER"
  );

  const mutation = useMutation({
    mutationFn: createLeadApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      form.reset(defaultLeadValues);
      onOpenChange(false);
      if (data.lead?.id) {
        window.location.href = `/leads/${data.lead.id}`;
      }
    },
  });

  function onSubmit(values: CreateLeadInput) {
    mutation.mutate(toCreateLeadPayload(values));
  }

  const textFields: Array<{ name: keyof CreateLeadInput; label: string; type?: "text" | "email" | "date" | "number" }> = [
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
    { name: "source", label: "Lead source" },
    { name: "vendor", label: "Lead vendor" },
    { name: "campaign", label: "Campaign name" },
    { name: "leadCost", label: "Lead cost", type: "number" },
    { name: "dateLeadReceived", label: "Date lead received", type: "date" },
    { name: "leadType", label: "Lead type" },
    { name: "leadFreshness", label: "Lead freshness" },
    { name: "spouseName", label: "Spouse name" },
    { name: "beneficiaryName", label: "Beneficiary name" },
    { name: "beneficiaryRelation", label: "Beneficiary relationship" },
    { name: "beneficiaryPhone", label: "Beneficiary phone" },
    { name: "emergencyContact", label: "Emergency contact" },
    { name: "childrenYesNo", label: "Children yes/no" },
    { name: "grandchildrenYesNo", label: "Grandchildren yes/no" },
    { name: "coverageAmountInterest", label: "Coverage amount wanted", type: "number" },
    { name: "budgetMonthlyPremiumTarget", label: "Budget/monthly premium target" },
    { name: "burialOrCremationPreference", label: "Burial or cremation preference" },
    { name: "existingLifeInsuranceYesNo", label: "Existing life insurance yes/no" },
    { name: "existingPolicyAmount", label: "Existing policy amount" },
    { name: "wantsFuneralPlanningHelpYesNo", label: "Wants funeral planning help yes/no" },
    { name: "preferredPaymentMode", label: "Preferred payment mode" },
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
    { name: "bankName", label: "Bank name" },
    { name: "routingNumber", label: "Routing number" },
    { name: "accountNumber", label: "Account number" },
    { name: "socialSecurityOrLast4", label: "Social Security number or last 4" },
    { name: "draftDate", label: "Draft date" },
    { name: "incomeSource", label: "Income source" },
    { name: "beneficiaryPayorIfDifferent", label: "Beneficiary payor if different" },
    { name: "paymentMethod", label: "Payment method" },
    { name: "replacementInvolvedYesNo", label: "Replacement involved yes/no" },
    { name: "carrierQuoted", label: "Carrier quoted" },
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add lead</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {textFields.map((cfg) => (
                <FormField
                  key={cfg.name}
                  control={form.control}
                  name={cfg.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cfg.label}</FormLabel>
                      <FormControl>
                        <Input
                          type={cfg.type ?? "text"}
                          value={(field.value as string | number | undefined) ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
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
            {mutation.isError && (
              <p className="text-sm text-destructive">{mutation.error.message}</p>
            )}
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create lead"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
