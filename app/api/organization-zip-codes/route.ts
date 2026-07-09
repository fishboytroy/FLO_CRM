import { NextRequest, NextResponse } from "next/server";
import { OrganizationZipCodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getActiveOrganization } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  canManageTerritories,
  isActiveTerritoryStatus,
  normalizeTerritoryZipCodes,
  parseTerritoryStatus,
  territoryConflictMessage
} from "@/lib/territory-zip-codes";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();

  const territories = await prisma.organizationZipCode.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: [{ status: "asc" }, { zipCode: "asc" }]
  });

  return NextResponse.json({ territories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrg = await getActiveOrganization();

  if (!canManageTerritories(activeOrg, session.user.role)) {
    return NextResponse.json({ error: "Only owners and admins can manage ZIP territories" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const zipCodes = normalizeTerritoryZipCodes(body?.zipCodes ?? body?.zipCode);
  if (!zipCodes.success) return NextResponse.json({ error: zipCodes.error }, { status: 400 });

  const status = parseTerritoryStatus(body?.status, OrganizationZipCodeStatus.active);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });

  const exclusive = body?.exclusive === undefined ? true : Boolean(body.exclusive);
  const assignedUserId = typeof body?.assignedUserId === "string" && body.assignedUserId.trim() ? body.assignedUserId.trim() : null;

  if (assignedUserId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: assignedUserId, organizationId: activeOrg.id } },
      select: { id: true }
    });
    if (!membership) return NextResponse.json({ error: "Assigned agent must be a member of this organization" }, { status: 400 });
  }

  if (exclusive && isActiveTerritoryStatus(status.status)) {
    const conflicts = await prisma.organizationZipCode.findMany({
      where: {
        zipCode: { in: zipCodes.zipCodes },
        exclusive: true,
        status: { in: [OrganizationZipCodeStatus.active, OrganizationZipCodeStatus.trialing] }
      },
      select: { id: true, organizationId: true, zipCode: true }
    });
    for (const zipCode of zipCodes.zipCodes) {
      const conflictMessage = territoryConflictMessage(conflicts.filter((record) => record.zipCode === zipCode), activeOrg.id);
      if (conflictMessage) return NextResponse.json({ error: `${zipCode}: ${conflictMessage}` }, { status: 409 });
    }
  }

  const territories = await prisma.$transaction(zipCodes.zipCodes.map((zipCode) => prisma.organizationZipCode.create({
    data: {
      organizationId: activeOrg.id,
      assignedUserId,
      zipCode,
      status: status.status,
      exclusive
    }
  })));

  return NextResponse.json({ territories }, { status: 201 });
}
