import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/access";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const { id } = await params;

  const existingTask = await prisma.task.findFirst({ where: { id, organizationId: activeOrg.id }, select: { id: true } });
  if (!existingTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const task = await prisma.task.update({
    where: { id },
    data: { status: "completed" }
  });

  await prisma.activity.create({
    data: {
      organizationId: activeOrg.id,
      leadId: task.leadId,
      userId: session.user.id,
      type: "task_completed",
      message: `Task completed: ${task.title}`
    }
  });

  return NextResponse.json({ task });
}
