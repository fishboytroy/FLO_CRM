import { NextRequest, NextResponse } from "next/server";
import { OrganizationZipCodeStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isPlatformAdminRole } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import {
  isActiveTerritoryStatus,
  normalizeTerritoryZipCode,
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
    const conflictMessage = territoryConflictMessage(conflicts, organization.id);
    if (conflictMessage) return NextResponse.json({ error: conflictMessage }, { status: 409 });
  }

  const territory = await prisma.organizationZipCode.create({
    data: {
      organizationId: organization.id,
      zipCode: zip.zipCode,
      status: status.status,
      exclusive
    }
  });

  return NextResponse.json({ territory }, { status: 201 });
}
