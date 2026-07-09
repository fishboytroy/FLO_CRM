import { NextRequest, NextResponse } from "next/server";
import { OrganizationZipCodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isPlatformAdminRole } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import {
  isActiveTerritoryStatus,
  normalizeTerritoryZipCodes,
  parseTerritoryStatus,
  territoryConflictMessage
} from "@/lib/territory-zip-codes";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const organization = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const status = parseTerritoryStatus(body?.status, OrganizationZipCodeStatus.active);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });

  const zipCodes = normalizeTerritoryZipCodes(body?.zipCodes ?? body?.zipCode);
  if (!zipCodes.success) return NextResponse.json({ error: zipCodes.error }, { status: 400 });

  const exclusive = body?.exclusive === undefined ? true : Boolean(body.exclusive);
  const assignedUserId = typeof body?.assignedUserId === "string" && body.assignedUserId.trim() ? body.assignedUserId.trim() : null;

  if (assignedUserId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: assignedUserId, organizationId: organization.id } },
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
      const conflictMessage = territoryConflictMessage(conflicts.filter((record) => record.zipCode === zipCode), organization.id);
      if (conflictMessage) return NextResponse.json({ error: `${zipCode}: ${conflictMessage}` }, { status: 409 });
    }
  }

  const territories = await prisma.$transaction(zipCodes.zipCodes.map((zipCode) => prisma.organizationZipCode.create({
    data: {
      organizationId: organization.id,
      assignedUserId,
      zipCode,
      status: status.status,
      exclusive
    }
  })));

  return NextResponse.json({ territories }, { status: 201 });
}
