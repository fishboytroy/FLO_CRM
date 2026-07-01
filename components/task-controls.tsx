"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { UserOption } from "@/components/lead-form";

export function TaskForm({ lead, users }: { lead: { id: string }; users: UserOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, leadId: lead.id })
    });
    setSaving(false);
    if (response.ok) {
      router.refresh();
      const form = document.getElementById(`task-form-${lead.id}`) as HTMLFormElement | null;
      form?.reset();
    }
  }

  return (
    <form id={`task-form-${lead.id}`} action={submit} className="space-y-3">
      <input name="title" placeholder="Follow-up task" required />
      <textarea name="description" placeholder="Task details" rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="dueDate" type="datetime-local" required />
        <select name="assignedUserId" defaultValue="">
          <option value="">Assign to me</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={saving}>{saving ? "Creating..." : "Create task"}</Button>
    </form>
  );
}

export function CompleteTaskButton({ id }: { id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    const response = await fetch(`/api/tasks/${id}/complete`, { method: "PATCH" });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button variant="secondary" onClick={complete} disabled={saving}>
      {saving ? "Saving..." : "Mark complete"}
    </Button>
  );
}
