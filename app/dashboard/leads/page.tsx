import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { labelFor, leadTypes, money, pipelineStages } from "@/lib/crm";
import { getActiveOrganization, getOrganizationUsers, scopedLeadWhere } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const activeOrg = await getActiveOrganization();
  const q = params.q?.trim();
  const where: Prisma.LeadWhereInput = {
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { desiredLocation: { contains: q, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(params.leadType ? { leadType: params.leadType as never } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(params.assignedAgentId ? { assignedAgentId: params.assignedAgentId } : {})
  };

  const [leads, agents, sources] = await Promise.all([
    prisma.lead.findMany({ where: scopedLeadWhere(activeOrg.id, where), orderBy: { updatedAt: "desc" }, include: { assignedAgent: true, tasks: true } }),
    getOrganizationUsers(activeOrg.id),
    prisma.lead.findMany({ distinct: ["source"], select: { source: true }, where: scopedLeadWhere(activeOrg.id, { source: { not: null } }), orderBy: { source: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Contacts and opportunities</h2>
        </div>
        <Link href="/dashboard/leads/new" className="rounded-md bg-bayou-600 px-4 py-2 text-sm font-semibold text-white hover:bg-bayou-700">
          New Lead
        </Link>
      </div>

      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-6">
          <input name="q" placeholder="Search leads..." defaultValue={q} className="md:col-span-2" />
          <select name="leadType" defaultValue={params.leadType ?? ""}>
            <option value="">All types</option>
            {leadTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">All stages</option>
            {pipelineStages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
          <select name="assignedAgentId" defaultValue={params.assignedAgentId ?? ""}>
            <option value="">All agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name ?? agent.email}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={params.source ?? ""}>
            <option value="">All sources</option>
            {sources.map((source) =>
              source.source ? (
                <option key={source.source} value={source.source}>
                  {source.source}
                </option>
              ) : null
            )}
          </select>
          <button className="rounded-md bg-cypress px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {leads.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <Link href={`/dashboard/leads/${lead.id}`} className="font-bold text-slate-900 hover:text-bayou-700">
                      {lead.firstName} {lead.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact info"}</p>
                  </td>
                  <td className="px-4 py-4"><Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge></td>
                  <td className="px-4 py-4">{labelFor(pipelineStages, lead.status)}</td>
                  <td className="px-4 py-4">{lead.desiredLocation ?? "Not set"}</td>
                  <td className="px-4 py-4">{money(lead.budgetMin)} - {money(lead.budgetMax)}</td>
                  <td className="px-4 py-4">{lead.assignedAgent?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-4">{lead.tasks.filter((task) => task.status === "pending").length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6">
            <EmptyState title="No leads found" description="Create a lead or adjust the search and filters." />
          </div>
        )}
      </Card>
    </div>
  );
}
