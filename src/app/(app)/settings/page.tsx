"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

interface IntegrationsConfig {
  telnyx?: { apiKey?: string; fromNumber?: string };
  outlook?: { fromEmail?: string; smtpUser?: string; smtpPass?: string };
}

interface AgencySettings {
  id: string;
  name: string;
  billingEmail: string | null;
  slug: string;
  integrations?: IntegrationsConfig;
}

interface MeUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
}

async function fetchSettings(): Promise<{ agency: AgencySettings }> {
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

async function patchSettings(data: { name?: string; billingEmail?: string; integrations?: IntegrationsConfig }) {
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
  const [telnyxApiKey, setTelnyxApiKey] = useState("");
  const [telnyxFromNumber, setTelnyxFromNumber] = useState("");
  const [outlookFromEmail, setOutlookFromEmail] = useState("");
  const [outlookSmtpUser, setOutlookSmtpUser] = useState("");
  const [outlookSmtpPass, setOutlookSmtpPass] = useState("");
  const [integrationsSaved, setIntegrationsSaved] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message?: string } | null>(null);

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
      setTelnyxApiKey(int.telnyx?.apiKey ?? "");
      setTelnyxFromNumber(int.telnyx?.fromNumber ?? "");
      setOutlookFromEmail(int.outlook?.fromEmail ?? "");
      setOutlookSmtpUser(int.outlook?.smtpUser ?? "");
      setOutlookSmtpPass(int.outlook?.smtpPass ?? "");
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

  function handleIntegrationsSubmit(e: React.FormEvent) {
    e.preventDefault();
    integrationsMutation.mutate({
      telnyx: telnyxApiKey || telnyxFromNumber
        ? { apiKey: telnyxApiKey || undefined, fromNumber: telnyxFromNumber || undefined }
        : undefined,
      outlook: outlookFromEmail || outlookSmtpUser || outlookSmtpPass
        ? { fromEmail: outlookFromEmail || undefined, smtpUser: outlookSmtpUser || undefined, smtpPass: outlookSmtpPass || undefined }
        : undefined,
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
              Configure <strong>SMS</strong> and <strong>Email (Outlook)</strong> so automations can send real messages. Leave blank to only log actions (no messages sent).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIntegrationsSubmit} className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">SMS</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="telnyx-api-key">API Key</Label>
                    <Input
                      id="telnyx-api-key"
                      type="password"
                      value={telnyxApiKey}
                      onChange={(e) => setTelnyxApiKey(e.target.value)}
                      placeholder="KEYxxxxxxxx..."
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telnyx-from">From number</Label>
                    <Input
                      id="telnyx-from"
                      value={telnyxFromNumber}
                      onChange={(e) => setTelnyxFromNumber(e.target.value)}
                      placeholder="+1234567890"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email (Outlook / Office 365)</h4>
                <p className="text-xs text-muted-foreground">
                  Use your Outlook or Microsoft 365 account. For 2FA accounts, use an app password from account.microsoft.com/security.
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
    </div>
  );
}
