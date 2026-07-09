import Link from "next/link";
import { format } from "date-fns";
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
            { zipCode: { contains: q, mode: "insensitive" } },
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">{activeOrg.name}</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Contacts and opportunities</h2>
        </div>
        <div className="grid gap-2 sm:flex">
          <Link href="/dashboard/leads/review" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-md border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-gold/15">
            Manual Review
          </Link>
          <Link href="/dashboard/leads/new" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-md bg-aqua-400 px-4 py-2 text-sm font-semibold text-obsidian-950 shadow-glow hover:bg-aqua-300">
            New Lead
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input name="q" placeholder="Search leads..." defaultValue={q} className="xl:col-span-2" />
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
          <button className="min-h-11 rounded-md bg-aqua-400 px-4 py-2 text-sm font-semibold text-obsidian-950 shadow-glow hover:bg-aqua-300">Filter</button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {leads.length ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {leads.map((lead) => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} prefetch={false} className="block rounded-lg border border-white/10 bg-obsidian-950/50 p-4 shadow-glass">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact info"}</p>
                    </div>
                    <Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stage</span>
                      <span className="text-right font-semibold text-slate-100">{labelFor(pipelineStages, lead.status)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">ZIP</span>
                      <span className="font-semibold text-slate-100">{lead.zipCode ?? "No ZIP"}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</p>
                      <p className="mt-1 break-words text-slate-300">{lead.source ?? "No source"}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</span>
                      <span className="font-semibold text-slate-100">{format(lead.createdAt, "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agent</span>
                      <span className="text-right font-semibold text-slate-100">{lead.assignedAgent?.name ?? "Unassigned"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
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
              <tbody className="divide-y divide-white/10 text-slate-300">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5">
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/leads/${lead.id}`} prefetch={false} className="font-bold text-white hover:text-aqua-100">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact info"}</p>
                    </td>
                    <td className="px-4 py-4"><Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge></td>
                    <td className="px-4 py-4">{labelFor(pipelineStages, lead.status)}</td>
                    <td className="px-4 py-4">
                      <p>{lead.desiredLocation ?? "Not set"}</p>
                      <p className="mt-1 text-xs text-slate-500">ZIP {lead.zipCode ?? "-"}</p>
                    </td>
                    <td className="px-4 py-4">{money(lead.budgetMin)} - {money(lead.budgetMax)}</td>
                    <td className="px-4 py-4">{lead.assignedAgent?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-4">{lead.tasks.filter((task) => task.status === "pending").length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="p-6">
            <EmptyState title="No leads found" description="Create a lead or adjust the search and filters." />
          </div>
        )}
      </Card>
    </div>
  );
}
