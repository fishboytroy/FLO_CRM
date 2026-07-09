import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { labelFor, leadTypes, money, pipelineStages } from "@/lib/crm";
import { DeleteLeadButton, NoteForm } from "@/components/lead-actions";
import { LeadForm } from "@/components/lead-form";
import { CompleteTaskButton, TaskForm } from "@/components/task-controls";
import { getActiveOrganization, getOrganizationUsers } from "@/lib/access";
import { isReviewAssignment, reviewReasonLabel } from "@/lib/review-leads";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activeOrg = await getActiveOrganization();
  const [lead, users] = await Promise.all([
    prisma.lead.findFirst({
      where: { id, organizationId: activeOrg.id },
      include: {
        assignedAgent: true,
        tasks: { orderBy: { dueDate: "asc" }, include: { assignedUser: true } },
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
        assignmentHistory: { orderBy: { createdAt: "desc" } }
      }
    }),
    getOrganizationUsers(activeOrg.id)
  ]);
  if (!lead) notFound();

  const reviewAssignment = lead.assignmentHistory.find(isReviewAssignment);
  const userOptions = users.map(({ id, name, email }) => ({ id, name, email }));
  const leadFormValue = {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    leadType: lead.leadType,
    status: lead.status,
    source: lead.source,
    assignedAgentId: lead.assignedAgentId,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    desiredLocation: lead.desiredLocation,
    zipCode: lead.zipCode,
    propertyInterest: lead.propertyInterest,
    timeframe: lead.timeframe,
    notes: lead.notes
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">Lead Detail</p>
          <h2 className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">
            {lead.firstName} {lead.lastName}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge>
            <Badge tone="blue">{labelFor(pipelineStages, lead.status)}</Badge>
            <Badge tone="gold">{lead.source ?? "No source"}</Badge>
            {reviewAssignment ? <Badge tone="red">{reviewReasonLabel(reviewAssignment)}</Badge> : null}
          </div>
        </div>
        <DeleteLeadButton id={lead.id} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Lead profile</h3>
            {reviewAssignment ? (
              <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-amber-100">
                <p className="font-bold">Needs Manual Review</p>
                <p className="mt-1">{reviewAssignment.message ?? reviewReasonLabel(reviewAssignment)}</p>
              </div>
            ) : null}
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Email" value={lead.email ?? "Not set"} />
              <Info label="Phone" value={lead.phone ?? "Not set"} />
              <Info label="Agent" value={lead.assignedAgent?.name ?? "Unassigned"} />
              <Info label="Location" value={lead.desiredLocation ?? "Not set"} />
              <Info label="Allocation ZIP" value={lead.zipCode ?? "No ZIP"} />
              <Info label="Budget" value={`${money(lead.budgetMin)} - ${money(lead.budgetMax)}`} />
              <Info label="Timeframe" value={lead.timeframe ?? "Not set"} />
              <Info label="Interest" value={lead.propertyInterest ?? "Not set"} />
              <Info label="Created" value={format(lead.createdAt, "MMM d, yyyy")} />
              <Info label="Updated" value={format(lead.updatedAt, "MMM d, yyyy")} />
            </dl>
            {lead.notes ? <p className="mt-5 break-words rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{lead.notes}</p> : null}
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Edit lead</h3>
            <div className="mt-5">
              <LeadForm agents={userOptions} lead={leadFormValue} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Add internal note</h3>
            <div className="mt-4">
              <NoteForm leadId={lead.id} />
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Tasks</h3>
            <div className="mt-4">
              <TaskForm lead={{ id: lead.id }} users={userOptions} />
            </div>
            <div className="mt-6 space-y-3">
              {lead.tasks.map((task) => (
                <div key={task.id} className="rounded-md border border-white/10 bg-obsidian-950/40 p-3">
                  <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-white">{task.title}</p>
                      <p className="text-xs text-slate-500">Due {format(task.dueDate, "MMM d, yyyy h:mm a")}</p>
                      {task.description ? <p className="mt-2 break-words text-sm text-slate-300">{task.description}</p> : null}
                    </div>
                    <Badge tone={task.status === "completed" ? "green" : "gold"}>{task.status}</Badge>
                  </div>
                  {task.status === "pending" ? <div className="mt-3"><CompleteTaskButton id={task.id} /></div> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Activity timeline</h3>
            <div className="mt-5 space-y-4">
              {lead.activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-aqua-400/35 pl-4">
                  <p className="break-words text-sm font-semibold text-slate-100">{activity.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.user?.name ?? "System"} - {format(activity.createdAt, "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
