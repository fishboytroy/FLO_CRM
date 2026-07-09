"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LeadType, PipelineStage } from "@prisma/client";
import { Button } from "@/components/ui";
import { leadTypes, pipelineStages } from "@/lib/crm";

export type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

export type LeadFormValue = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  leadType?: LeadType;
  status?: PipelineStage;
  source?: string | null;
  assignedAgentId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  desiredLocation?: string | null;
  zipCode?: string | null;
  propertyInterest?: string | null;
  timeframe?: string | null;
  notes?: string | null;
};

export function LeadForm({ agents, lead }: { agents: UserOption[]; lead?: LeadFormValue }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch(lead?.id ? `/api/leads/${lead.id}` : "/api/leads", {
      method: lead?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const zipErrors = data?.error?.fieldErrors?.zipCode;
      setError(zipErrors?.[0] ?? "Please check the lead details and try again.");
      return;
    }
    const data = await response.json();
    router.push(`/dashboard/leads/${data.lead.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" defaultValue={lead?.firstName} required />
        <Field label="Last name" name="lastName" defaultValue={lead?.lastName} required />
        <Field label="Email" name="email" type="email" defaultValue={lead?.email ?? ""} />
        <Field label="Phone" name="phone" defaultValue={lead?.phone ?? ""} />
        <Select label="Lead type" name="leadType" defaultValue={lead?.leadType ?? "unknown"} options={leadTypes} />
        <Select label="Pipeline status" name="status" defaultValue={lead?.status ?? "new_lead"} options={pipelineStages} />
        <Field label="Source" name="source" defaultValue={lead?.source ?? ""} placeholder="Website, referral, Facebook ad" />
        <div className="grid gap-2">
          <label htmlFor="assignedAgentId">Assigned agent</label>
          <select id="assignedAgentId" name="assignedAgentId" defaultValue={lead?.assignedAgentId ?? ""}>
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name ?? agent.email}
              </option>
            ))}
          </select>
        </div>
        <Field label="Budget min" name="budgetMin" type="number" defaultValue={lead?.budgetMin ?? ""} />
        <Field label="Budget max" name="budgetMax" type="number" defaultValue={lead?.budgetMax ?? ""} />
        <Field label="Desired location" name="desiredLocation" defaultValue={lead?.desiredLocation ?? ""} />
        <Field label="Allocation ZIP" name="zipCode" defaultValue={lead?.zipCode ?? ""} placeholder="70508" />
        <Field label="Property interest" name="propertyInterest" defaultValue={lead?.propertyInterest ?? ""} />
        <Field label="Timeframe" name="timeframe" defaultValue={lead?.timeframe ?? ""} />
      </div>
      <div className="grid gap-2">
        <label htmlFor="notes">Internal notes</label>
        <textarea id="notes" name="notes" rows={5} defaultValue={lead?.notes ?? ""} />
      </div>
      <Button className="w-full sm:w-auto" disabled={saving}>{saving ? "Saving..." : lead?.id ? "Update lead" : "Create lead"}</Button>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props;
  return (
    <div className="grid gap-2">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} {...inputProps} />
    </div>
  );
}

function Select<T extends string>({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: T; options: { value: T; label: string }[] }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
