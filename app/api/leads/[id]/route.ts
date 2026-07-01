import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validation";
import { getActiveOrganization, isOrganizationMember } from "@/lib/access";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: activeOrg.id },
    include: { assignedAgent: true, tasks: { orderBy: { dueDate: "asc" } }, activities: { orderBy: { createdAt: "desc" }, include: { user: true } } }
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const { id } = await params;

  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.assignedAgentId && !(await isOrganizationMember(parsed.data.assignedAgentId, activeOrg.id))) {
    return NextResponse.json({ error: "Assigned agent is not a member of this organization" }, { status: 400 });
  }

  const existingLead = await prisma.lead.findFirst({ where: { id, organizationId: activeOrg.id }, select: { id: true } });
  if (!existingLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...parsed.data,
      assignedAgentId: parsed.data.assignedAgentId || null,
      activities: {
        create: {
          organizationId: activeOrg.id,
          userId: session.user.id,
          type: "lead_updated",
          message: "Lead details updated."
        }
      }
    }
  });

  return NextResponse.json({ lead });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  if (!["platform_admin", "admin"].includes(session.user.role) && !["owner", "admin"].includes(activeOrg.role)) {
    return NextResponse.json({ error: "Only admins can delete leads" }, { status: 403 });
  }
  const { id } = await params;
  const existingLead = await prisma.lead.findFirst({ where: { id, organizationId: activeOrg.id }, select: { id: true } });
  if (!existingLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
