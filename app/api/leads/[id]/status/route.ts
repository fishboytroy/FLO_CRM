import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { labelFor, pipelineStages } from "@/lib/crm";
import { pipelineMoveSchema } from "@/lib/validation";
import { getActiveOrganization } from "@/lib/access";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const { id } = await params;
  const parsed = pipelineMoveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existingLead = await prisma.lead.findFirst({ where: { id, organizationId: activeOrg.id }, select: { id: true } });
  if (!existingLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      status: parsed.data.status,
      activities: {
        create: {
          organizationId: activeOrg.id,
          userId: session.user.id,
          type: "status_change",
          message: `Moved lead to ${labelFor(pipelineStages, parsed.data.status)}.`
        }
      }
    }
  });

  return NextResponse.json({ lead });
}
