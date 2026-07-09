import { NextRequest, NextResponse } from "next/server";
import { OrganizationZipCodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getActiveOrganization } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canManageTerritories, isActiveTerritoryStatus, parseTerritoryStatus, territoryConflictMessage } from "@/lib/territory-zip-codes";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();

  if (!canManageTerritories(activeOrg, session.user.role)) {
    return NextResponse.json({ error: "Only owners and admins can manage ZIP territories" }, { status: 403 });
  }

  const { id } = await params;
  const territory = await prisma.organizationZipCode.findFirst({
    where: { id, organizationId: activeOrg.id }
  });
  if (!territory) return NextResponse.json({ error: "Territory not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const status = parseTerritoryStatus(body?.status);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const assignedUserId = typeof body?.assignedUserId === "string" && body.assignedUserId.trim() ? body.assignedUserId.trim() : null;

  if (assignedUserId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: assignedUserId, organizationId: activeOrg.id } },
      select: { id: true }
    });
    if (!membership) return NextResponse.json({ error: "Assigned agent must be a member of this organization" }, { status: 400 });
  }

  if (territory.exclusive && isActiveTerritoryStatus(status.status)) {
    const conflicts = await prisma.organizationZipCode.findMany({
      where: {
        zipCode: territory.zipCode,
        exclusive: true,
        status: { in: [OrganizationZipCodeStatus.active, OrganizationZipCodeStatus.trialing] }
      },
      select: { id: true, organizationId: true }
    });
    const conflictMessage = territoryConflictMessage(conflicts, activeOrg.id, territory.id);
    if (conflictMessage) return NextResponse.json({ error: conflictMessage }, { status: 409 });
  }

  const updatedTerritory = await prisma.organizationZipCode.update({
    where: { id: territory.id },
    data: { status: status.status, assignedUserId }
  });

  return NextResponse.json({ territory: updatedTerritory });
}
