import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { noteSchema } from "@/lib/validation";
import { getActiveOrganization } from "@/lib/access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();
  const { id } = await params;
  const parsed = noteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lead = await prisma.lead.findFirst({ where: { id, organizationId: activeOrg.id }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await prisma.activity.create({
    data: {
      organizationId: activeOrg.id,
      leadId: id,
      userId: session.user.id,
      type: "note",
      message: parsed.data.message
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
