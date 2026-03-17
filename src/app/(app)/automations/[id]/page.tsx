"use client";

import { useParams } from "next/navigation";
import { WorkflowBuilder } from "@/components/automations/workflow-builder";

export default function EditAutomationPage() {
  const { id } = useParams<{ id: string }>();
  return <WorkflowBuilder automationId={id} />;
}
