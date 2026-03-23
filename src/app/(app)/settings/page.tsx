"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

interface IntegrationsConfig {
  /** From number in DB; API key is TELNYX_API_KEY on the server */
  telnyx?: { fromNumber?: string };
  outlook?: { fromEmail?: string; smtpUser?: string; smtpPass?: string };
}

interface AgencySettings {
  id: string;
  name: string;
  billingEmail: string | null;
  slug: string;
  integrations?: IntegrationsConfig;
  templates?: {
    welcomeSms?: string;
  };
}

interface IntegrationsMeta {
  telnyxApiKeyConfigured: boolean;
  telnyxFromNumberSaved: boolean;
  replit: boolean;
  envPresence?: {
    outlookFromEmail: boolean;
    outlookSmtpUser: boolean;
    outlookSmtpPass: boolean;
    telnyxFromNumber: boolean;
  };
}

interface MeUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
}

async function fetchSettings(): Promise<{ agency: AgencySettings; integrationsMeta?: IntegrationsMeta }> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function fetchMe(): Promise<{ user: MeUser }> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

async function patchMe(data: { name?: string }) {
  const res = await fetch("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save profile");
  }
  return res.json();
}

async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to change password");
  }
  return body;
}

async function patchSettings(data: {
  name?: string;
  billingEmail?: string;
  integrations?: IntegrationsConfig;
  templates?: { welcomeSms?: string };
}) {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save settings");
  }
  return res.json();
}

function AgentSettingsPanel() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  const [displayName, setDisplayName] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  useEffect(() => {
    if (data?.user?.name) setDisplayName(data.user.name);
  }, [data]);

  const profileMutation = useMutation({
    mutationFn: patchMe,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      await updateSession?.();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordMessage({ ok: true, text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(null), 5000);
    },
    onError: (err: Error) => {
      setPasswordMessage({ ok: false, text: err.message });
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    profileMutation.mutate({ name: displayName.trim() });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-2xl rounded-lg" />;
  }

  const user = data?.user;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle>My profile</CardTitle>
          <CardDescription>Update how your name appears in the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Display name</Label>
              <Input
                id="agent-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Contact an agency owner to change your email.</p>
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username ?? "—"} disabled className="bg-muted/50 font-mono text-sm" />
            </div>
            {profileMutation.isError && (
              <p className="text-sm text-destructive">{(profileMutation.error as Error).message}</p>
            )}
            {profileSaved && <p className="text-sm font-medium text-green-600">Profile saved</p>}
            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use a strong password you don&apos;t use elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {passwordMessage && (
              <p className={passwordMessage.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
                {passwordMessage.text}
              </p>
            )}
            <Button type="submit" variant="secondary" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { data: sessionData } = useSession();
  const role = (sessionData?.user as { role?: string } | undefined)?.role;
  const isAgent = role === "AGENT";
  const canEdit = role === "AGENCY_OWNER" || role === "SUPER_ADMIN";

  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [telnyxFromNumber, setTelnyxFromNumber] = useState("");
  const [outlookFromEmail, setOutlookFromEmail] = useState("");
  const [outlookSmtpUser, setOutlookSmtpUser] = useState("");
  const [outlookSmtpPass, setOutlookSmtpPass] = useState("");
  const [integrationsSaved, setIntegrationsSaved] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [testSmsTo, setTestSmsTo] = useState("");
  const [testSmsResult, setTestSmsResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [welcomeSmsTemplate, setWelcomeSmsTemplate] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !isAgent,
  });

  useEffect(() => {
    if (data?.agency) {
      setName(data.agency.name);
      setBillingEmail(data.agency.billingEmail ?? "");
      const int = data.agency.integrations ?? {};
      setTelnyxFromNumber(int.telnyx?.fromNumber ?? "");
      setOutlookFromEmail(int.outlook?.fromEmail ?? "");
      setOutlookSmtpUser(int.outlook?.smtpUser ?? "");
      setOutlookSmtpPass(int.outlook?.smtpPass ?? "");
      setWelcomeSmsTemplate(data.agency.templates?.welcomeSms ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: patchSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const integrationsMutation = useMutation({
    mutationFn: (integrations: IntegrationsConfig) => patchSettings({ integrations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setIntegrationsSaved(true);
      setTimeout(() => setIntegrationsSaved(false), 3000);
    },
  });

  const templateMutation = useMutation({
    mutationFn: (welcomeSms: string) => patchSettings({ templates: { welcomeSms } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ name, billingEmail });
  }

  const testEmailMutation = useMutation({
    mutationFn: async (to: string) => {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      return data;
    },
    onSuccess: (data) => {
      setTestEmailResult({ ok: true, message: data.message ?? "Sent!" });
      setTimeout(() => setTestEmailResult(null), 5000);
    },
    onError: (err: Error) => {
      setTestEmailResult({ ok: false, message: err.message });
    },
  });

  const testSmsMutation = useMutation({
    mutationFn: async (to: string) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 45_000);
      try {
        const res = await fetch("/api/settings/test-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to send");
        return data;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          throw new Error("Request timed out after 45s. Check Replit Secrets, From number, and try again.");
        }
        throw e;
      } finally {
        clearTimeout(t);
      }
    },
    onSuccess: (data) => {
      setTestSmsResult({ ok: true, message: data.message ?? "Sent!" });
      setTimeout(() => setTestSmsResult(null), 5000);
    },
    onError: (err: Error) => {
      setTestSmsResult({ ok: false, message: err.message });
    },
  });

  function handleIntegrationsSubmit(e: React.FormEvent) {
    e.preventDefault();
    integrationsMutation.mutate({
      telnyx: { fromNumber: telnyxFromNumber.trim() },
      outlook: outlookFromEmail || outlookSmtpUser || outlookSmtpPass
        ? { fromEmail: outlookFromEmail || undefined, smtpUser: outlookSmtpUser || undefined, smtpPass: outlookSmtpPass || undefined }
        : undefined,
    });
  }

  function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    templateMutation.mutate(welcomeSmsTemplate);
  }

  const templateVariables = [
    "clientName", "agentName", "carrierName", "policyNumber", "coverageAmount", "monthlyPremium", "draftDate", "carrierServiceNumber", "officeNumber",
    "leadFirstName", "leadLastName", "leadFullName", "leadPhone", "leadEmail", "leadCity", "leadState", "leadZip", "leadDisposition", "leadPipelineStage", "leadSource",
    "fullName", "phone", "phone2", "dateOfBirth", "age", "gender", "maritalStatus", "address", "city", "state", "zip", "county", "timeZone",
    "preferredContactMethod", "bestTimeToCall", "vendor", "campaign", "leadCost", "dateLeadReceived", "leadType", "leadFreshness", "spouseName",
    "beneficiaryName", "beneficiaryRelation", "beneficiaryPhone", "emergencyContact", "childrenYesNo", "grandchildrenYesNo", "decisionMakerNotes",
    "coverageAmountInterest", "budgetMonthlyPremiumTarget", "burialOrCremationPreference", "existingLifeInsuranceYesNo", "existingPolicyAmount",
    "concernReasonForBuying", "wantsFuneralPlanningHelpYesNo", "preferredPaymentMode", "height", "weight", "tobaccoStatus", "prescriptionMedications",
    "majorConditions", "hospitalizationsLast2Years", "cancerHistory", "heartHistory", "diabetes", "copdOxygenUse", "strokeHistory", "kidneyDisease",
    "mobilityIssues", "mentalCapacityConcerns", "nursingHomeAssistedLivingStatus", "recentSurgeries", "underwritingClassEstimatedEligibility",
    "knockoutConditionYesNo", "bankName", "routingNumber", "accountNumber", "socialSecurityOrLast4", "incomeSource", "beneficiaryPayorIfDifferent",
    "paymentMethod", "replacementInvolvedYesNo", "carrierQuoted", "planProduct", "faceAmount", "premium", "applicationDate", "applicationStatus",
    "writingAgent", "splitAgent", "effectiveDate", "approvalDate", "declineReason", "chargebackRisk", "persistencyNotes", "notes",
  ] as const;

  function insertTemplateVariable(variable: string) {
    const token = `{{${variable}}}`;
    const el = templateRef.current;
    if (!el) {
      setWelcomeSmsTemplate((prev) => `${prev}${prev ? " " : ""}${token}`);
      return;
    }
    const start = el.selectionStart ?? welcomeSmsTemplate.length;
    const end = el.selectionEnd ?? start;
    const before = welcomeSmsTemplate.slice(0, start);
    const after = welcomeSmsTemplate.slice(end);
    const next = `${before}${token}${after}`;
    setWelcomeSmsTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  if (isAgent) {
    return (
      <div className="space-y-6">
        <PageHeader title="My settings" description="Your profile and password" />
        <AgentSettingsPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your agency profile" />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <Card className="border-border/80 shadow-soft max-w-2xl">
          <CardHeader>
            <CardTitle>Agency settings</CardTitle>
            <CardDescription>
              {canEdit
                ? "Update your agency name and billing email."
                : "View your agency information. Only agency owners can edit settings."}{" "}
              Slug:{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {data?.agency.slug}
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="agency-name">Agency Name</Label>
                <Input
                  id="agency-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing-email">Billing Email</Label>
                <Input
                  id="billing-email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="billing@example.com"
                  disabled={!canEdit}
                />
              </div>

              {mutation.isError && (
                <p className="text-sm text-destructive">{mutation.error.message}</p>
              )}

              {saved && (
                <p className="text-sm font-medium text-green-600">Settings saved</p>
              )}

              {canEdit && (
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Integrations — for automations SMS/Email */}
      {!isLoading && (
        <Card className="border-border/80 shadow-soft max-w-2xl">
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Configure <strong>SMS</strong> and <strong>Email (Outlook)</strong> so automations can send real messages. Leave blank to only log actions (no messages sent).{" "}
              <span className="text-muted-foreground">
                Telnyx API key is <code className="text-xs">TELNYX_API_KEY</code> in server env / Replit Secrets (not stored in the app).
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.integrationsMeta && (
              <div className="mb-6 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-4 text-sm">
                <p className="font-medium">SMS readiness (what the server sees)</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <span className="text-foreground">TELNYX_API_KEY:</span>{" "}
                    {data.integrationsMeta.telnyxApiKeyConfigured ? (
                      <span className="font-medium text-green-600">configured</span>
                    ) : (
                      <span className="font-medium text-destructive">missing</span>
                    )}
                  </li>
                  <li>
                    <span className="text-foreground">From number (app or secret):</span>{" "}
                    {data.integrationsMeta.telnyxFromNumberSaved ? (
                      <span className="font-medium text-green-600">configured</span>
                    ) : (
                      <span className="font-medium text-amber-600">missing — set below or add <code className="text-xs">TELNYX_FROM_NUMBER</code> to secrets</span>
                    )}
                  </li>
                </ul>
                {data.integrationsMeta.envPresence && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="mb-1 font-medium text-foreground">Outlook (optional env overrides)</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Replit Secrets: <code className="rounded bg-muted px-1">OUTLOOK_FROM_EMAIL</code>,{" "}
                      <code className="rounded bg-muted px-1">OUTLOOK_SMTP_USER</code>,{" "}
                      <code className="rounded bg-muted px-1">OUTLOOK_SMTP_PASSWORD</code>. Env overrides the fields below.
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                      <li>OUTLOOK_FROM_EMAIL: {data.integrationsMeta.envPresence.outlookFromEmail ? <span className="text-green-600">set</span> : "—"}</li>
                      <li>OUTLOOK_SMTP_USER: {data.integrationsMeta.envPresence.outlookSmtpUser ? <span className="text-green-600">set</span> : "—"}</li>
                      <li>OUTLOOK_SMTP_PASSWORD: {data.integrationsMeta.envPresence.outlookSmtpPass ? <span className="text-green-600">set</span> : "—"}</li>
                      <li>TELNYX_FROM_NUMBER: {data.integrationsMeta.envPresence.telnyxFromNumber ? <span className="text-green-600">set</span> : "—"}</li>
                    </ul>
                  </div>
                )}
                {data.integrationsMeta.replit && (
                  <p className="mt-2 text-xs text-foreground">
                    <strong>Replit:</strong> add a Secret named exactly <code className="rounded bg-muted px-1">TELNYX_API_KEY</code> (Tools → Secrets / lock icon). For{" "}
                    <strong>Published Deployments</strong>, add the same secret under Deployment secrets and redeploy. Then <strong>Stop</strong> and <strong>Run</strong> the Repl.
                  </p>
                )}
              </div>
            )}
            <form onSubmit={handleIntegrationsSubmit} className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">SMS (Telnyx)</h4>
                <p className="text-xs text-muted-foreground">
                  API key: <code className="rounded bg-muted px-1">TELNYX_API_KEY</code>. From number: save here, or set secret <code className="rounded bg-muted px-1">TELNYX_FROM_NUMBER</code> (E.164). In Telnyx, the number must be on a <strong>messaging profile</strong>. Optional:{" "}
                  <code className="rounded bg-muted px-1">TELNYX_MESSAGING_PROFILE_ID</code>.
                </p>
                <div className="max-w-md space-y-1.5">
                  <Label htmlFor="telnyx-from">From number (or use TELNYX_FROM_NUMBER secret)</Label>
                  <Input
                    id="telnyx-from"
                    value={telnyxFromNumber}
                    onChange={(e) => setTelnyxFromNumber(e.target.value)}
                    placeholder="+1234567890"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-sm font-medium">Send test SMS</p>
                  <p className="text-xs text-muted-foreground">
                    {data?.integrationsMeta?.replit ? (
                      <>
                        Uses <code className="rounded bg-muted px-1">TELNYX_API_KEY</code> from Replit <strong>Secrets</strong> and the From number above (click <strong>Save integrations</strong> first). Phone must be E.164, e.g. <code className="rounded bg-muted px-1">+15614515321</code>.
                      </>
                    ) : (
                      <>
                        Uses <code className="rounded bg-muted px-1">TELNYX_API_KEY</code> from <code className="rounded bg-muted px-1">.env.local</code> or <code className="rounded bg-muted px-1">.env</code> at the project root, and the From number above (save integrations first). Restart the dev server after editing env files.
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="tel"
                      placeholder="+15551234567"
                      value={testSmsTo}
                      onChange={(e) => setTestSmsTo(e.target.value)}
                      className="max-w-xs"
                      disabled={!canEdit}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => testSmsTo.trim() && testSmsMutation.mutate(testSmsTo.trim())}
                      disabled={!canEdit || testSmsMutation.isPending || !testSmsTo.trim()}
                    >
                      {testSmsMutation.isPending ? "Sending…" : "Send test SMS"}
                    </Button>
                  </div>
                  {testSmsResult && (
                    <p className={testSmsResult.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
                      {testSmsResult.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email (Outlook / Office 365)</h4>
                <p className="text-xs text-muted-foreground">
                  Use your Outlook or Microsoft 365 account. For 2FA, use an app password from account.microsoft.com/security. You can store credentials in Replit Secrets as{" "}
                  <code className="rounded bg-muted px-1">OUTLOOK_FROM_EMAIL</code>, <code className="rounded bg-muted px-1">OUTLOOK_SMTP_USER</code>,{" "}
                  <code className="rounded bg-muted px-1">OUTLOOK_SMTP_PASSWORD</code> — they override these fields when set.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="outlook-from">From email</Label>
                    <Input
                      id="outlook-from"
                      type="email"
                      value={outlookFromEmail}
                      onChange={(e) => setOutlookFromEmail(e.target.value)}
                      placeholder="you@outlook.com"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outlook-smtp-user">SMTP user (usually same as From)</Label>
                    <Input
                      id="outlook-smtp-user"
                      type="email"
                      value={outlookSmtpUser}
                      onChange={(e) => setOutlookSmtpUser(e.target.value)}
                      placeholder="you@outlook.com"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="outlook-smtp-pass">SMTP password (or app password)</Label>
                    <Input
                      id="outlook-smtp-pass"
                      type="password"
                      value={outlookSmtpPass}
                      onChange={(e) => setOutlookSmtpPass(e.target.value)}
                      placeholder="••••••••"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-sm font-medium">Send test email</p>
                <p className="text-xs text-muted-foreground">Verify Outlook is working by sending a test to any address.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="max-w-xs"
                    disabled={!canEdit}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => testEmailTo.trim() && testEmailMutation.mutate(testEmailTo.trim())}
                    disabled={!canEdit || testEmailMutation.isPending || !testEmailTo.trim()}
                  >
                    {testEmailMutation.isPending ? "Sending…" : "Send test email"}
                  </Button>
                </div>
                {testEmailResult && (
                  <p className={testEmailResult.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
                    {testEmailResult.message}
                  </p>
                )}
              </div>

              {integrationsMutation.isError && (
                <p className="text-sm text-destructive">{integrationsMutation.error.message}</p>
              )}
              {integrationsSaved && (
                <p className="text-sm font-medium text-green-600">Integrations saved</p>
              )}

              {canEdit && (
                <Button type="submit" disabled={integrationsMutation.isPending}>
                  {integrationsMutation.isPending ? "Saving..." : "Save integrations"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <Card className="border-border/80 shadow-soft max-w-2xl">
          <CardHeader>
            <CardTitle>Message templates</CardTitle>
            <CardDescription>
              Customize the SMS sent after a lead becomes a client. Use variables in double braces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-sms-template">Welcome SMS template</Label>
                <Textarea
                  id="welcome-sms-template"
                  rows={12}
                  ref={templateRef}
                  value={welcomeSmsTemplate}
                  onChange={(e) => setWelcomeSmsTemplate(e.target.value)}
                  placeholder="Hi {{clientName}}, this is {{agentName}}..."
                  disabled={!canEdit}
                />
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Available variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {templateVariables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-md border border-border/70 bg-background px-2 py-1 text-[11px] text-foreground hover:bg-accent"
                      onClick={() => insertTemplateVariable(v)}
                      disabled={!canEdit}
                      title={`Insert {{${v}}}`}
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              {templateMutation.isError && (
                <p className="text-sm text-destructive">{templateMutation.error.message}</p>
              )}
              {templateSaved && (
                <p className="text-sm font-medium text-green-600">Template saved</p>
              )}
              {canEdit && (
                <Button type="submit" disabled={templateMutation.isPending}>
                  {templateMutation.isPending ? "Saving..." : "Save template"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
