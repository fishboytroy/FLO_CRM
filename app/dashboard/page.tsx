import { startOfWeek, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ActivityType, PipelineStage, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";
import { labelFor, pipelineStages } from "@/lib/crm";
import { getActiveOrganization, scopedLeadWhere, scopedTaskWhere } from "@/lib/access";
import { reviewLeadWhere } from "@/lib/review-leads";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const activeOrg = await getActiveOrganization();

  const [totalLeads, newThisWeek, hotLeads, tasksToday, reviewLeads, recentActivity] = await prisma.$transaction([
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id) }),
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id, { createdAt: { gte: weekStart } }) }),
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id, { status: { in: [PipelineStage.qualified, PipelineStage.appointment_set, PipelineStage.showing_scheduled, PipelineStage.offer_stage] } }) }),
    prisma.task.count({ where: scopedTaskWhere(activeOrg.id, { status: TaskStatus.pending, dueDate: { gte: todayStart, lte: todayEnd } }) }),
    prisma.lead.count({ where: reviewLeadWhere(activeOrg.id) }),
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
    { label: "Tasks due today", value: tasksToday },
    { label: "Leads needing review", value: reviewLeads, href: "/dashboard/leads/review" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Lafayette lead command center</h2>
        </div>
        <Link href="/dashboard/leads/new" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-md bg-bayou-600 px-4 py-2 text-sm font-semibold text-white hover:bg-bayou-700">
          New Lead
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{stat.value}</p>
            {stat.href ? <Link href={stat.href} prefetch={false} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-bayou-700">Review leads</Link> : null}
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold">Recent lead activity</h3>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-bayou-700" href="/dashboard/leads" prefetch={false}>
              View leads
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex flex-col gap-2 border-b border-slate-100 pb-4 last:border-0 sm:flex-row sm:gap-4">
                  <div>
                    <Badge tone={activity.type === ActivityType.note ? "gold" : "green"}>{activity.type.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {activity.lead.firstName} {activity.lead.lastName}
                    </p>
                    {activity.lead.zipCode ? <p className="mt-1 text-xs font-semibold text-slate-500">ZIP {activity.lead.zipCode}</p> : null}
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
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-bold">Hot stages</h3>
          <div className="mt-5 space-y-3">
            {pipelineStages.slice(2, 6).map((stage) => (
              <div key={stage.value} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
                <span>{labelFor(pipelineStages, stage.value)}</span>
                <span className="text-right font-semibold text-bayou-700">{stage.value.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
