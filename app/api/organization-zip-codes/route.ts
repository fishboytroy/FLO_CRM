import { NextRequest, NextResponse } from "next/server";
import { OrganizationZipCodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getActiveOrganization } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  canManageTerritories,
  isActiveTerritoryStatus,
  normalizeTerritoryZipCode,
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
  const zip = normalizeTerritoryZipCode(body?.zipCode);
  if (!zip.success) return NextResponse.json({ error: zip.error }, { status: 400 });

  const status = parseTerritoryStatus(body?.status, OrganizationZipCodeStatus.active);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });

  const exclusive = body?.exclusive === undefined ? true : Boolean(body.exclusive);

  if (exclusive && isActiveTerritoryStatus(status.status)) {
    const conflicts = await prisma.organizationZipCode.findMany({
      where: {
        zipCode: zip.zipCode,
        exclusive: true,
        status: { in: [OrganizationZipCodeStatus.active, OrganizationZipCodeStatus.trialing] }
      },
      select: { id: true, organizationId: true }
    });
    const conflictMessage = territoryConflictMessage(conflicts, activeOrg.id);
    if (conflictMessage) return NextResponse.json({ error: conflictMessage }, { status: 409 });
  }

  const territory = await prisma.organizationZipCode.create({
    data: {
      organizationId: activeOrg.id,
      zipCode: zip.zipCode,
      status: status.status,
      exclusive
    }
  });

  return NextResponse.json({ territory }, { status: 201 });
}
