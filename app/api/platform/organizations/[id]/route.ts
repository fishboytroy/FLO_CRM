import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { INTERNAL_ORG_ID } from "@/lib/access";
import { isPlatformAdminRole } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, plan: true }
  });

  if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (organization.id === INTERNAL_ORG_ID || organization.plan === "internal") {
    return NextResponse.json({ error: "The internal Lafayette organization cannot be deleted." }, { status: 400 });
  }

  await prisma.organization.delete({ where: { id: organization.id } });

  return NextResponse.json({ deleted: true });
}
