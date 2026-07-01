import { endOfDay, format, startOfDay } from "date-fns";
import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { CompleteTaskButton } from "@/components/task-controls";
import { getActiveOrganization, scopedTaskWhere } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const now = new Date();
  const activeOrg = await getActiveOrganization();
  const params = await searchParams;
  const view = params?.view ?? "all";
  const where =
    view === "today"
      ? { status: TaskStatus.pending, dueDate: { gte: startOfDay(now), lte: endOfDay(now) } }
      : view === "overdue"
        ? { status: TaskStatus.pending, dueDate: { lt: startOfDay(now) } }
        : {};

  const tasks = await prisma.task.findMany({
    where: scopedTaskWhere(activeOrg.id, where),
    orderBy: { dueDate: "asc" },
    include: { lead: true, assignedUser: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Follow-ups and reminders</h2>
      </div>
      <div className="flex gap-2">
        {["all", "today", "overdue"].map((item) => (
          <Link key={item} href={`/dashboard/tasks?view=${item}`} className={`rounded-md px-4 py-2 text-sm font-semibold ${view === item ? "bg-cypress text-white" : "bg-white text-slate-700"}`}>
            {item[0].toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </div>
      <Card className="p-6">
        {tasks.length ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
                <div>
                  <Link href={`/dashboard/leads/${task.leadId}`} className="font-bold text-slate-900 hover:text-bayou-700">
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.lead.firstName} {task.lead.lastName} - due {format(task.dueDate, "MMM d, yyyy h:mm a")}
                  </p>
                  {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={task.status === "completed" ? "green" : task.dueDate < now ? "red" : "gold"}>{task.status}</Badge>
                  {task.status === "pending" ? <CompleteTaskButton id={task.id} /> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No tasks in this view" description="Tasks created from lead detail pages will appear here." />
        )}
      </Card>
    </div>
  );
}
