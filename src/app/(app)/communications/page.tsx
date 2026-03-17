"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { MessageSquare, Mail, Smartphone } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  {
    title: "SMS templates",
    description: "New lead intro, missed call follow-up, appointment reminder, document request",
    icon: Smartphone,
    examples: ["New lead intro", "Missed call follow-up", "Appointment reminder", "Document request", "Birthday check-in", "Policy review reminder"],
  },
  {
    title: "Email templates",
    description: "Appointment confirmation, welcome, application reminder",
    icon: Mail,
    examples: ["Appointment confirmation", "Welcome email", "Application reminder", "Policy issued congratulations"],
  },
];

export default function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications"
        description="SMS and email templates · Send from a lead or client detail page"
      />
      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message threads
          </CardTitle>
          <CardDescription>
            Open a lead or client to view their thread and send SMS or email. All messages are logged in the timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/leads"><Button variant="outline">Open Leads</Button></Link>
            <Link href="/clients"><Button variant="outline">Open Clients</Button></Link>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
          <Card key={cat.title} className="border-border/80 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" />
                {cat.title}
              </CardTitle>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {cat.examples.map((ex) => (
                  <li key={ex}>· {ex}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Templates are available when sending from a lead or client.</p>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
