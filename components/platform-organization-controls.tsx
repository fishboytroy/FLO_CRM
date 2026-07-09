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

async function deleteJson(url: string) {
  const response = await fetch(url, { method: "DELETE" });

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

export function SendMemberInviteButton({ organizationId, userId }: { organizationId: string; userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onClick() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/platform/organizations/${organizationId}/members/${userId}/invite`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not send invite.");
      }
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={onClick} disabled={saving}>
        {saving ? "Sending..." : "Send invite"}
      </Button>
      <FormError error={error} />
    </div>
  );
}

type TerritoryMemberOption = {
  userId: string;
  role: MembershipRole;
  user: {
    name: string | null;
    email: string;
  };
};

export function AssignOrganizationTerritoryForm({
  organizationId,
  members
}: {
  organizationId: string;
  members: TerritoryMemberOption[];
}) {
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
    <form action={onSubmit} className="grid gap-3 xl:grid-cols-[1fr_160px_180px_auto]">
      <input type="hidden" name="exclusive" value="true" />
      <div className="grid gap-2">
        <label htmlFor={`territory-zips-${organizationId}`}>Add ZIP codes</label>
        <input id={`territory-zips-${organizationId}`} name="zipCodes" placeholder="70508, 70503, 70506" required />
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
      <div className="grid gap-2">
        <label htmlFor={`territory-agent-${organizationId}`}>Agent</label>
        <select id={`territory-agent-${organizationId}`} name="assignedUserId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user.name ?? member.user.email} ({member.role})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <Button className="w-full xl:w-auto" variant="secondary" disabled={saving}>{saving ? "Assigning..." : "Assign ZIPs"}</Button>
      </div>
      <div className="xl:col-span-4">
        <FormError error={error} />
      </div>
    </form>
  );
}

export function DeleteOrganizationButton({ organizationId, organizationName, disabled = false }: { organizationId: string; organizationName: string; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const confirmed = confirmation.trim() === organizationName;

  async function onDelete() {
    setError(null);
    setSaving(true);
    try {
      await deleteJson(`/api/platform/organizations/${organizationId}`);
      setOpen(false);
      setConfirmation("");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="danger" disabled={disabled} onClick={() => setOpen(true)}>
        Delete
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-md border border-red-400/30 bg-obsidian-950 p-5 shadow-2xl shadow-red-950/40">
            <h3 className="text-lg font-bold text-white">Delete organization?</h3>
            <p className="mt-2 text-sm text-slate-300">
              This permanently removes this organization, its memberships, ZIP territories, leads, tasks, and activity. User accounts are not deleted.
            </p>
            <div className="mt-4 grid gap-2">
              <label htmlFor={`delete-org-${organizationId}`}>Type the organization name to confirm</label>
              <input
                id={`delete-org-${organizationId}`}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={organizationName}
              />
            </div>
            <div className="mt-4">
              <FormError error={error} />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={onDelete} disabled={!confirmed || saving}>
                {saving ? "Deleting..." : "Delete organization"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
