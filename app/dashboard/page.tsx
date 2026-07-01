import { startOfWeek, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ActivityType, PipelineStage, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";
import { labelFor, pipelineStages } from "@/lib/crm";
import { getActiveOrganization, scopedLeadWhere, scopedTaskWhere } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const activeOrg = await getActiveOrganization();

  const [totalLeads, newThisWeek, hotLeads, tasksToday, recentActivity] = await Promise.all([
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id) }),
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id, { createdAt: { gte: weekStart } }) }),
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id, { status: { in: [PipelineStage.qualified, PipelineStage.appointment_set, PipelineStage.showing_scheduled, PipelineStage.offer_stage] } }) }),
    prisma.task.count({ where: scopedTaskWhere(activeOrg.id, { status: TaskStatus.pending, dueDate: { gte: todayStart, lte: todayEnd } }) }),
    prisma.activity.findMany({
      where: { organizationId: activeOrg.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lead: true, user: true }
    })
  ]);

  const stats = [
    { label: "Total leads", value: totalLeads },
    { label: "New leads this week", value: newThisWeek },
    { label: "Hot leads", value: hotLeads },
    { label: "Tasks due today", value: tasksToday }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Lafayette lead command center</h2>
        </div>
        <Link href="/dashboard/leads/new" className="rounded-md bg-bayou-600 px-4 py-2 text-sm font-semibold text-white hover:bg-bayou-700">
          New Lead
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent lead activity</h3>
            <Link className="text-sm font-semibold text-bayou-700" href="/dashboard/leads">
              View leads
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4 border-b border-slate-100 pb-4 last:border-0">
                  <Badge tone={activity.type === ActivityType.note ? "gold" : "green"}>{activity.type.replaceAll("_", " ")}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {activity.lead.firstName} {activity.lead.lastName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{activity.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDistanceToNow(activity.createdAt, { addSuffix: true })}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No activity yet" description="Lead actions will appear here as agents work the pipeline." />
            )}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-bold">Hot stages</h3>
          <div className="mt-5 space-y-3">
            {pipelineStages.slice(2, 6).map((stage) => (
              <div key={stage.value} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                <span>{labelFor(pipelineStages, stage.value)}</span>
                <span className="font-semibold text-bayou-700">{stage.value.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
