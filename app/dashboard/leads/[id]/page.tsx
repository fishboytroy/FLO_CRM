import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { labelFor, leadTypes, money, pipelineStages } from "@/lib/crm";
import { DeleteLeadButton, NoteForm } from "@/components/lead-actions";
import { LeadForm } from "@/components/lead-form";
import { CompleteTaskButton, TaskForm } from "@/components/task-controls";
import { getActiveOrganization, getOrganizationUsers } from "@/lib/access";

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
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } }
      }
    }),
    getOrganizationUsers(activeOrg.id)
  ]);
  if (!lead) notFound();

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
    propertyInterest: lead.propertyInterest,
    timeframe: lead.timeframe,
    notes: lead.notes
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">Lead Detail</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge>
            <Badge tone="blue">{labelFor(pipelineStages, lead.status)}</Badge>
            <Badge tone="gold">{lead.source ?? "No source"}</Badge>
          </div>
        </div>
        <DeleteLeadButton id={lead.id} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold">Lead profile</h3>
            <dl className="mt-5 grid gap-4 md:grid-cols-3">
              <Info label="Email" value={lead.email ?? "Not set"} />
              <Info label="Phone" value={lead.phone ?? "Not set"} />
              <Info label="Agent" value={lead.assignedAgent?.name ?? "Unassigned"} />
              <Info label="Location" value={lead.desiredLocation ?? "Not set"} />
              <Info label="Budget" value={`${money(lead.budgetMin)} - ${money(lead.budgetMax)}`} />
              <Info label="Timeframe" value={lead.timeframe ?? "Not set"} />
              <Info label="Interest" value={lead.propertyInterest ?? "Not set"} />
              <Info label="Created" value={format(lead.createdAt, "MMM d, yyyy")} />
              <Info label="Updated" value={format(lead.updatedAt, "MMM d, yyyy")} />
            </dl>
            {lead.notes ? <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">{lead.notes}</p> : null}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold">Edit lead</h3>
            <div className="mt-5">
              <LeadForm agents={userOptions} lead={leadFormValue} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold">Add internal note</h3>
            <div className="mt-4">
              <NoteForm leadId={lead.id} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold">Tasks</h3>
            <div className="mt-4">
              <TaskForm lead={{ id: lead.id }} users={userOptions} />
            </div>
            <div className="mt-6 space-y-3">
              {lead.tasks.map((task) => (
                <div key={task.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-xs text-slate-500">Due {format(task.dueDate, "MMM d, yyyy h:mm a")}</p>
                      {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                    </div>
                    <Badge tone={task.status === "completed" ? "green" : "gold"}>{task.status}</Badge>
                  </div>
                  {task.status === "pending" ? <div className="mt-3"><CompleteTaskButton id={task.id} /></div> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold">Activity timeline</h3>
            <div className="mt-5 space-y-4">
              {lead.activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-bayou-100 pl-4">
                  <p className="text-sm font-semibold text-slate-900">{activity.message}</p>
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
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
