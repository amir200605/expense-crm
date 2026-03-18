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

async function fetchSettings(): Promise<{ agency: AgencySettings }> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
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

export default function SettingsPage() {
  const { data: sessionData } = useSession();
  const role = (sessionData?.user as { role?: string } | undefined)?.role;
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
                <h4 className="text-sm font-medium">SMS (Telnyx)</h4>
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
