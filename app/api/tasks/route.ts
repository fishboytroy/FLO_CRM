import { NextRequest, NextResponse } from "next/server";
import { Prisma, TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validation";
import { getActiveOrganization, isOrganizationMember, scopedTaskWhere } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const status = request.nextUrl.searchParams.get("status") as TaskStatus | null;
  const where: Prisma.TaskWhereInput = status ? { status } : {};
  const tasks = await prisma.task.findMany({
    where: scopedTaskWhere(activeOrg.id, where),
    orderBy: { dueDate: "asc" },
    include: { lead: true, assignedUser: true }
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const parsed = taskSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { leadId, assignedUserId, dueDate, ...taskData } = parsed.data;
  if (assignedUserId && !(await isOrganizationMember(assignedUserId, activeOrg.id))) {
    return NextResponse.json({ error: "Assigned user is not a member of this organization" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: activeOrg.id }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      ...taskData,
      organizationId: activeOrg.id,
      leadId,
      assignedUserId: assignedUserId || session.user.id,
      dueDate: new Date(dueDate)
    }
  });

  await prisma.activity.create({
    data: {
      organizationId: activeOrg.id,
      leadId,
      userId: session.user.id,
      type: "task_created",
      message: `Task created: ${task.title}`
    }
  });

  return NextResponse.json({ task }, { status: 201 });
}
