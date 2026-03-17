"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AppointmentFormSheet } from "@/components/appointments/appointment-form-sheet";
import { formatDate } from "@/lib/utils";
import { Calendar as CalendarIcon, Phone, Video, Plus } from "lucide-react";

async function fetchAppointments(from: string, to: string) {
  const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function CalendarPage() {
  const [formOpen, setFormOpen] = useState(false);
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", from, to],
    queryFn: () => fetchAppointments(from, to),
  });

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Your appointments" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Scheduled appointments for this month"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add appointment
          </Button>
        }
      />
      <AppointmentFormSheet open={formOpen} onOpenChange={setFormOpen} />
      <Card className="border-border/80 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Appointments</CardTitle>
          <CardDescription>Phone, video, or in-person — click a lead name to open</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon />}
              title="No appointments"
              description="Click 'Add appointment' to schedule one."
              action={{ label: "Add appointment", onClick: () => setFormOpen(true) }}
            />
          ) : (
            <ul className="space-y-3">
              {items.map((apt: { id: string; date: string; startTime: string; endTime: string; type: string; lead: { id: string; fullName: string | null } | null }) => (
                <li
                  key={apt.id}
                  className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {apt.type === "VIDEO" ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatDate(apt.date)} · {apt.startTime} – {apt.endTime}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.type?.replace(/_/g, " ")} · {apt.lead?.fullName ?? "—"}
                    </p>
                  </div>
                  {apt.lead?.id && (
                    <a
                      href={`/leads/${apt.lead.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Open lead
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
