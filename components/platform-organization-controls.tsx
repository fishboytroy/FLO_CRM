"use client";

import { MembershipRole, OrganizationPlan, OrganizationStatus, OrganizationZipCodeStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

async function postJson(url: string, formData: FormData) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(formData.entries()))
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Request failed.");
  }
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{error}</p>;
}

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      await postJson("/api/platform/organizations", formData);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
      <div className="grid gap-2">
        <label htmlFor="platform-org-name">Organization name</label>
        <input id="platform-org-name" name="name" placeholder="Acadiana Test Team" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor="platform-org-plan">Plan</label>
        <select id="platform-org-plan" name="plan" defaultValue={OrganizationPlan.individual}>
          <option value={OrganizationPlan.individual}>Individual</option>
          <option value={OrganizationPlan.team}>Team</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="platform-org-status">Status</label>
        <select id="platform-org-status" name="status" defaultValue={OrganizationStatus.active}>
          <option value={OrganizationStatus.active}>Active</option>
          <option value={OrganizationStatus.trialing}>Trialing</option>
          <option value={OrganizationStatus.past_due}>Past due</option>
          <option value={OrganizationStatus.canceled}>Canceled</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button className="w-full lg:w-auto" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
      </div>
      <div className="lg:col-span-4">
        <FormError error={error} />
      </div>
    </form>
  );
}

export function AddOrganizationMemberForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      await postJson(`/api/platform/organizations/${organizationId}/members`, formData);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3 xl:grid-cols-[1fr_1fr_140px_auto]">
      <div className="grid gap-2">
        <label htmlFor={`member-email-${organizationId}`}>User email</label>
        <input id={`member-email-${organizationId}`} name="email" type="email" placeholder="owner@example.com" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`member-name-${organizationId}`}>Name</label>
        <input id={`member-name-${organizationId}`} name="name" placeholder="Optional" />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`member-role-${organizationId}`}>Role</label>
        <select id={`member-role-${organizationId}`} name="role" defaultValue={MembershipRole.owner}>
          <option value={MembershipRole.owner}>Owner</option>
          <option value={MembershipRole.admin}>Admin</option>
          <option value={MembershipRole.agent}>Agent</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button className="w-full xl:w-auto" variant="secondary" disabled={saving}>{saving ? "Adding..." : "Add member"}</Button>
      </div>
      <div className="xl:col-span-4">
        <FormError error={error} />
      </div>
    </form>
  );
}

export function AssignOrganizationTerritoryForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      await postJson(`/api/platform/organizations/${organizationId}/territories`, formData);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not assign ZIP territory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3 xl:grid-cols-[1fr_160px_auto]">
      <input type="hidden" name="exclusive" value="true" />
      <div className="grid gap-2">
        <label htmlFor={`territory-zip-${organizationId}`}>ZIP code</label>
        <input id={`territory-zip-${organizationId}`} name="zipCode" placeholder="70508" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`territory-status-${organizationId}`}>Status</label>
        <select id={`territory-status-${organizationId}`} name="status" defaultValue={OrganizationZipCodeStatus.active}>
          <option value={OrganizationZipCodeStatus.active}>Active</option>
          <option value={OrganizationZipCodeStatus.trialing}>Trialing</option>
          <option value={OrganizationZipCodeStatus.expired}>Expired</option>
          <option value={OrganizationZipCodeStatus.canceled}>Canceled</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button className="w-full xl:w-auto" variant="secondary" disabled={saving}>{saving ? "Assigning..." : "Assign ZIP"}</Button>
      </div>
      <div className="xl:col-span-3">
        <FormError error={error} />
      </div>
    </form>
  );
}
