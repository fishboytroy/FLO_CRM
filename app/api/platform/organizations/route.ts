import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isPlatformAdminRole,
  normalizeOrganizationName,
  parsePlatformOrganizationPlan,
  parsePlatformOrganizationStatus,
  slugifyOrganizationName
} from "@/lib/platform-admin";

async function uniqueOrganizationSlug(name: string) {
  const base = slugifyOrganizationName(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const organizations = await prisma.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: {
        select: {
          memberships: true,
          zipCodes: true,
          leads: true
        }
      }
    }
  });

  return NextResponse.json({ organizations });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const name = normalizeOrganizationName(body?.name);
  if (!name.success) return NextResponse.json({ error: name.error }, { status: 400 });

  const plan = parsePlatformOrganizationPlan(body?.plan);
  if (!plan.success) return NextResponse.json({ error: plan.error }, { status: 400 });

  const status = parsePlatformOrganizationStatus(body?.status);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });

  const organization = await prisma.organization.create({
    data: {
      name: name.name,
      slug: await uniqueOrganizationSlug(name.name),
      plan: plan.plan,
      status: status.status
    }
  });

  return NextResponse.json({ organization }, { status: 201 });
}
