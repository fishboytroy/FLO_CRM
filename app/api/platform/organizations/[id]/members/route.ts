import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { isPlatformAdminRole, normalizePlatformEmail, parsePlatformMembershipRole } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id } = await params;
  const organization = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const email = normalizePlatformEmail(body?.email);
  if (!email.success) return NextResponse.json({ error: email.error }, { status: 400 });

  const role = parsePlatformMembershipRole(body?.role);
  if (!role.success) return NextResponse.json({ error: role.error }, { status: 400 });

  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const existingUser = await prisma.user.findUnique({ where: { email: email.email } });
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: existingUser.name || !name ? {} : { name }
      })
    : await prisma.user.create({
        data: {
          email: email.email,
          name: name || null,
          role: Role.agent
        }
      });

  const membership = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: role.role },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: role.role
    },
    include: { user: true }
  });

  return NextResponse.json({ membership }, { status: 201 });
}
