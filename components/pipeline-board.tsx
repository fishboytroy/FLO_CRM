"use client";

import { Lead, User } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pipelineStages, labelFor, money } from "@/lib/crm";
import { Badge, Card } from "@/components/ui";

type PipelineLead = Lead & { assignedAgent: User | null };

export function PipelineBoard({ leads }: { leads: PipelineLead[] }) {
  const router = useRouter();

  async function moveLead(id: string, status: string) {
    const response = await fetch(`/api/leads/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {pipelineStages.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.status === stage.value);
        return (
          <section key={stage.value} className="min-w-0 rounded-lg border border-slate-200 bg-white/60 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">{stage.label}</h3>
              <Badge>{stageLeads.length}</Badge>
            </div>
            <div className="space-y-3">
              {stageLeads.map((lead) => (
                <Card key={lead.id} className="p-4">
                  <Link href={`/dashboard/leads/${lead.id}`} prefetch={false} className="break-words font-bold text-slate-900 hover:text-bayou-700">
                    {lead.firstName} {lead.lastName}
                  </Link>
                  <p className="mt-1 break-words text-xs text-slate-500">{lead.desiredLocation ?? "Location not set"}</p>
                  <p className="mt-3 text-sm text-slate-700">
                    {money(lead.budgetMin)} - {money(lead.budgetMax)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{lead.assignedAgent?.name ?? "Unassigned"}</p>
                  <select className="mt-4 w-full" value={lead.status} onChange={(event) => moveLead(lead.id, event.target.value)}>
                    {pipelineStages.map((option) => (
                      <option key={option.value} value={option.value}>
                        {labelFor(pipelineStages, option.value)}
                      </option>
                    ))}
                  </select>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
