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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">{activeOrg.name}</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Follow-ups and reminders</h2>
      </div>
      <div className="grid gap-2 sm:flex">
        {["all", "today", "overdue"].map((item) => (
          <Link key={item} href={`/dashboard/tasks?view=${item}`} prefetch={false} className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold ${view === item ? "border-aqua-400/40 bg-aqua-400 text-obsidian-950 shadow-glow" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}>
            {item[0].toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </div>
      <Card className="p-4 sm:p-6">
        {tasks.length ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="grid gap-4 rounded-md border border-white/10 bg-obsidian-950/40 p-4 lg:flex lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <Link href={`/dashboard/leads/${task.leadId}`} prefetch={false} className="font-bold text-white hover:text-aqua-100">
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500 break-words">
                    {task.lead.firstName} {task.lead.lastName} - due {format(task.dueDate, "MMM d, yyyy h:mm a")}
                  </p>
                  {task.description ? <p className="mt-2 break-words text-sm text-slate-300">{task.description}</p> : null}
                </div>
                <div className="grid gap-3 sm:flex sm:items-center">
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
