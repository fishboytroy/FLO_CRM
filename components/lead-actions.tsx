"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function DeleteLeadButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteLead() {
    if (!confirm("Delete this lead and all related tasks/activity?")) return;
    setDeleting(true);
    const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (response.ok) {
      router.push("/dashboard/leads");
      router.refresh();
    }
  }

  return (
    <Button className="w-full sm:w-auto" variant="danger" onClick={deleteLead} disabled={deleting}>
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    setSaving(false);
    if (response.ok) {
      setMessage("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Add an internal note..." />
      <Button className="w-full sm:w-auto" onClick={submit} disabled={saving || !message.trim()}>
        {saving ? "Adding..." : "Add note"}
      </Button>
    </div>
  );
}
