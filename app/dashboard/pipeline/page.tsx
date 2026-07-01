import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "@/components/pipeline-board";
import { getActiveOrganization, scopedLeadWhere } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const activeOrg = await getActiveOrganization();
  const leads = await prisma.lead.findMany({
    where: scopedLeadWhere(activeOrg.id),
    orderBy: { updatedAt: "desc" },
    include: { assignedAgent: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Kanban lead flow</h2>
      </div>
      <PipelineBoard leads={leads} />
    </div>
  );
}
