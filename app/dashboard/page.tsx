import { startOfWeek, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ActivityType, PipelineStage, TaskStatus, LeadDistributionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";
import { labelFor, pipelineStages } from "@/lib/crm";
import { getActiveOrganization, scopedLeadWhere, scopedTaskWhere } from "@/lib/access";
import { reviewLeadWhere } from "@/lib/review-leads";

export const dynamic = "force-dynamic";

function MiniSparkline({ values, tone = "aqua" }: { values: number[]; tone?: "aqua" | "gold" | "ember" }) {
  const max = Math.max(...values, 1);
  const tones = {
    aqua: "bg-aqua-400",
    gold: "bg-gold",
    ember: "bg-ember-400"
  };

  return (
    <div className="flex h-9 items-end gap-1" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} className={`w-full rounded-t-sm ${tones[tone]} opacity-80`} style={{ height: `${Math.max(18, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  tone = "aqua",
  href
}: {
  label: string;
  value: string | number;
  caption: string;
  tone?: "aqua" | "gold" | "ember";
  href?: string;
}) {
  const sparkValues = String(value)
    .split("")
    .map((char, index) => (Number.isFinite(Number(char)) ? Number(char) + 2 : index + 3))
    .slice(0, 9);
  const values = sparkValues.length ? sparkValues : [2, 4, 3, 6, 5, 8, 7];
  const toneClasses = {
    aqua: "text-aqua-100 border-aqua-400/25 bg-aqua-400/10",
    gold: "text-amber-100 border-gold/30 bg-gold/10",
    ember: "text-orange-100 border-ember-400/30 bg-ember-500/10"
  };

  const content = (
    <Card className="p-4 transition hover:border-aqua-400/30 hover:bg-obsidian-850/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${toneClasses[tone]}`}>Live</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 min-h-5 text-xs font-medium text-slate-400">{caption}</p>
      <div className="mt-4">
        <MiniSparkline values={values} tone={tone} />
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} prefetch={false} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function groupCount(count: unknown) {
  if (!count || typeof count !== "object") {
    return 0;
  }

  const values = count as { id?: number; _all?: number };
  return values.id ?? values._all ?? 0;
}

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const activeOrg = await getActiveOrganization();

  const [totalLeads, newThisWeek, hotLeads, tasksToday, reviewLeads, recentActivity, stageCounts, sourceCounts, unassignedLeads] = await prisma.$transaction([
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
    }),
    prisma.lead.groupBy({ by: ["status"], where: scopedLeadWhere(activeOrg.id), _count: { id: true }, orderBy: { status: "asc" } }),
    prisma.lead.groupBy({ by: ["source"], where: scopedLeadWhere(activeOrg.id), _count: { id: true }, orderBy: { source: "asc" } }),
    prisma.lead.count({ where: scopedLeadWhere(activeOrg.id, { distributionStatus: LeadDistributionStatus.unassigned }) })
  ]);

  const stageCountMap = new Map(stageCounts.map((stage) => [stage.status, groupCount(stage._count)]));
  const conversionRate = totalLeads ? Math.round(((stageCountMap.get(PipelineStage.closed) ?? 0) / totalLeads) * 1000) / 10 : 0;
  const pipelineValue = totalLeads * 38500;
  const velocityScore = totalLeads ? Math.max(0.1, Math.round((hotLeads / totalLeads) * 100) / 10) : 0;
  const topSources = sourceCounts
    .map((source) => ({ label: source.source ?? "Unattributed", count: groupCount(source._count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const insights = [
    {
      title: reviewLeads ? "Review queue active" : "Review queue clear",
      body: reviewLeads ? `${reviewLeads} leads need routing or database review.` : "No leads are waiting in the manual review queue.",
      href: "/dashboard/leads/review",
      tone: reviewLeads ? "gold" : "green"
    },
    {
      title: unassignedLeads ? "Assignment attention" : "Assignments current",
      body: unassignedLeads ? `${unassignedLeads} leads are still unassigned.` : "Lead assignment status is clean for this organization.",
      href: "/dashboard/leads",
      tone: unassignedLeads ? "red" : "green"
    },
    {
      title: tasksToday ? "Follow-up window" : "Task load stable",
      body: tasksToday ? `${tasksToday} tasks are due today.` : "No pending tasks are due today.",
      href: "/dashboard/tasks",
      tone: tasksToday ? "blue" : "green"
    }
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">{activeOrg.name}</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Lafayette lead command center</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Live operational view across lead capture, ZIP routing, follow-up workload, and pipeline movement.</p>
        </div>
        <Link href="/dashboard/leads/new" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-md bg-aqua-400 px-4 py-2 text-sm font-semibold text-obsidian-950 shadow-glow transition hover:bg-aqua-300">
          New Lead
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total leads" value={totalLeads.toLocaleString()} caption="All active CRM records" />
        <MetricCard label="New this week" value={newThisWeek.toLocaleString()} caption="Since Monday" />
        <MetricCard label="Hot leads" value={hotLeads.toLocaleString()} caption="Qualified through offer stage" tone="ember" />
        <MetricCard label="Tasks due today" value={tasksToday.toLocaleString()} caption="Pending follow-ups" tone="gold" href="/dashboard/tasks" />
        <MetricCard label="Needs review" value={reviewLeads.toLocaleString()} caption="Manual routing queue" tone={reviewLeads ? "ember" : "aqua"} href="/dashboard/leads/review" />
        <MetricCard label="Conversion" value={`${conversionRate}%`} caption="Closed against total leads" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr_360px]">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pipeline velocity</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_180px] sm:items-center">
            <div>
              <p className="text-3xl font-bold text-white">${(pipelineValue / 1000000).toFixed(2)}M</p>
              <p className="mt-2 text-sm text-slate-400">Estimated active pipeline value using a conservative lead value model.</p>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <dt className="text-slate-500">Hot ratio</dt>
                  <dd className="mt-1 font-semibold text-aqua-100">{velocityScore}x</dd>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <dt className="text-slate-500">Review</dt>
                  <dd className="mt-1 font-semibold text-amber-100">{reviewLeads}</dd>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <dt className="text-slate-500">Unassigned</dt>
                  <dd className="mt-1 font-semibold text-orange-100">{unassignedLeads}</dd>
                </div>
              </dl>
            </div>
            <div className="relative mx-auto grid size-40 place-items-center rounded-full border border-aqua-400/30 bg-aqua-400/10 shadow-glow">
              <div className="absolute inset-4 rounded-full border border-aqua-400/25" />
              <div className="absolute inset-9 rounded-full border border-gold/20" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{velocityScore}x</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-aqua-100">Velocity</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pipeline funnel</p>
          <div className="mt-5 space-y-4">
            {pipelineStages.map((stage) => {
              const count = stageCountMap.get(stage.value) ?? 0;
              const width = totalLeads ? Math.max(8, Math.round((count / totalLeads) * 100)) : 8;
              return (
                <div key={stage.value} className="grid grid-cols-[128px_1fr_44px] items-center gap-3 text-sm">
                  <span className="truncate text-slate-300">{labelFor(pipelineStages, stage.value)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-aqua-400" style={{ width: `${width}%` }} />
                  </span>
                  <span className="text-right font-semibold text-slate-100">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-gold/25 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">AI insights</p>
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-amber-100">Rule-based</span>
          </div>
          <div className="mt-5 space-y-3">
            {insights.map((insight) => (
              <Link key={insight.title} href={insight.href} prefetch={false} className="block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-aqua-400/25 hover:bg-white/10">
                <Badge tone={insight.tone}>{insight.title}</Badge>
                <p className="mt-3 text-sm leading-6 text-slate-300">{insight.body}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Lead pipeline snapshot</p>
              <h3 className="mt-2 text-lg font-bold text-white">Active stage inventory</h3>
            </div>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-aqua-100 hover:text-white" href="/dashboard/pipeline" prefetch={false}>
              Open pipeline
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pipelineStages.slice(0, 8).map((stage) => {
              const count = stageCountMap.get(stage.value) ?? 0;
              return (
                <div key={stage.value} className="rounded-lg border border-white/10 bg-obsidian-950/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{labelFor(pipelineStages, stage.value)}</p>
                  <p className="mt-3 text-2xl font-bold text-white">{count}</p>
                  <p className="mt-1 text-xs text-slate-500">{totalLeads ? `${Math.round((count / totalLeads) * 100)}% of pipeline` : "No active leads"}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source breakdown</p>
          <div className="mt-5 space-y-4">
            {topSources.length ? (
              topSources.map((source) => {
                const width = totalLeads ? Math.max(10, Math.round((source.count / totalLeads) * 100)) : 10;
                return (
                  <div key={source.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-300">{source.label}</span>
                      <span className="font-semibold text-white">{source.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No source data" description="Lead source breakdown appears after intake records include source details." />
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Recent activity</p>
              <h3 className="mt-2 text-lg font-bold text-white">Latest CRM movement</h3>
            </div>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-aqua-100 hover:text-white" href="/dashboard/leads" prefetch={false}>
              View leads
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex flex-col gap-2 border-b border-white/10 pb-4 last:border-0 sm:flex-row sm:gap-4">
                  <div>
                    <Badge tone={activity.type === ActivityType.note ? "gold" : "green"}>{activity.type.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {activity.lead.firstName} {activity.lead.lastName}
                    </p>
                    {activity.lead.zipCode ? <p className="mt-1 text-xs font-semibold text-slate-500">ZIP {activity.lead.zipCode}</p> : null}
                    <p className="mt-1 text-sm leading-6 text-slate-300">{activity.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDistanceToNow(activity.createdAt, { addSuffix: true })}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No activity yet" description="Lead actions will appear here as agents work the pipeline." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mobile-ready command view</p>
          <div className="mt-5 rounded-[2rem] border border-white/10 bg-obsidian-950 p-3 shadow-glass">
            <div className="rounded-[1.5rem] border border-white/10 bg-obsidian-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">9:41</span>
                <span className="text-xs font-semibold text-aqua-100">Live</span>
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-gold">Lafayette</p>
              <h3 className="mt-1 text-lg font-bold text-white">Dashboard</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-slate-500">Leads</p>
                  <p className="mt-1 text-xl font-bold text-white">{totalLeads}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] text-slate-500">Review</p>
                  <p className="mt-1 text-xl font-bold text-white">{reviewLeads}</p>
                </div>
              </div>
              <div className="mt-4">
                <MiniSparkline values={[totalLeads, newThisWeek + 2, hotLeads + 3, tasksToday + 4, reviewLeads + 5]} />
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
