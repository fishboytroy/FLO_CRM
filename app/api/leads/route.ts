import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validation";
import { getActiveOrganization, isOrganizationMember, scopedLeadWhere } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const where: Prisma.LeadWhereInput = {
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { desiredLocation: { contains: q, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(params.get("leadType") ? { leadType: params.get("leadType") as never } : {}),
    ...(params.get("status") ? { status: params.get("status") as never } : {}),
    ...(params.get("source") ? { source: params.get("source") ?? undefined } : {}),
    ...(params.get("assignedAgentId") ? { assignedAgentId: params.get("assignedAgentId") ?? undefined } : {})
  };

  const leads = await prisma.lead.findMany({
    where: scopedLeadWhere(activeOrg.id, where),
    orderBy: { updatedAt: "desc" },
    include: { assignedAgent: true, tasks: true }
  });

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();

  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.assignedAgentId && !(await isOrganizationMember(parsed.data.assignedAgentId, activeOrg.id))) {
    return NextResponse.json({ error: "Assigned agent is not a member of this organization" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      organizationId: activeOrg.id,
      assignedAgentId: parsed.data.assignedAgentId || null,
      activities: {
        create: {
          organizationId: activeOrg.id,
          userId: session.user.id,
          type: "lead_created",
          message: "Lead created in CRM."
        }
      }
    }
  });

  return NextResponse.json({ lead }, { status: 201 });
}
