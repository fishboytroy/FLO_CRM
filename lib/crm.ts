import { LeadType, PipelineStage, TaskStatus } from "@prisma/client";

export const pipelineStages: { value: PipelineStage; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "appointment_set", label: "Appointment Set" },
  { value: "showing_scheduled", label: "Showing Scheduled" },
  { value: "offer_stage", label: "Offer Stage" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" }
];

export const leadTypes: { value: LeadType; label: string }[] = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "investor", label: "Investor" },
  { value: "renter", label: "Renter" },
  { value: "unknown", label: "Unknown" }
];

export const taskStatuses: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" }
];

export function labelFor<T extends string>(items: { value: T; label: string }[], value: T | null | undefined) {
  return items.find((item) => item.value === value)?.label ?? "Unknown";
}

export function money(value: number | null | undefined) {
  if (value == null) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
