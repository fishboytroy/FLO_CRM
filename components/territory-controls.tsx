"use client";

import { OrganizationZipCodeStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function AddTerritoryForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    const response = await fetch("/api/organization-zip-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not add ZIP territory.");
      return;
    }

    router.refresh();
  }

  return (
    <form action={onSubmit} className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
      <div className="grid gap-2">
        <label htmlFor="zipCode">ZIP code</label>
        <input id="zipCode" name="zipCode" placeholder="70508" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={OrganizationZipCodeStatus.active}>
          <option value={OrganizationZipCodeStatus.active}>Active</option>
          <option value={OrganizationZipCodeStatus.trialing}>Trialing</option>
          <option value={OrganizationZipCodeStatus.expired}>Expired</option>
          <option value={OrganizationZipCodeStatus.canceled}>Canceled</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button className="w-full lg:w-auto" disabled={saving}>{saving ? "Adding..." : "Add ZIP"}</Button>
      </div>
      {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100 lg:col-span-3">{error}</p> : null}
    </form>
  );
}

export function TerritoryStatusForm({ id, status }: { id: string; status: OrganizationZipCodeStatus }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/organization-zip-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not update ZIP territory.");
      return;
    }

    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-2">
      <div className="grid gap-2 sm:flex">
        <select name="status" defaultValue={status} aria-label="Territory status">
          <option value={OrganizationZipCodeStatus.active}>Active</option>
          <option value={OrganizationZipCodeStatus.trialing}>Trialing</option>
          <option value={OrganizationZipCodeStatus.expired}>Expired</option>
          <option value={OrganizationZipCodeStatus.canceled}>Canceled</option>
        </select>
        <Button className="w-full sm:w-auto" variant="secondary" disabled={saving}>
          {saving ? "Saving..." : "Update"}
        </Button>
      </div>
      {error ? <p className="text-xs font-semibold text-red-100">{error}</p> : null}
    </form>
  );
}
