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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">{activeOrg.name}</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Kanban lead flow</h2>
      </div>
      <PipelineBoard leads={leads} />
    </div>
  );
}
