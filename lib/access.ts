import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const INTERNAL_ORG_ID = "org_internal_lafayette";

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isPlatformAdmin: boolean;
};

export async function getActiveOrganization(): Promise<ActiveOrganization> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isPlatformAdmin = session.user.role === "platform_admin";

  if (isPlatformAdmin) {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: session.user.organizationId || INTERNAL_ORG_ID }
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: session.user.organizationRole || "owner",
      isPlatformAdmin
    };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      ...(session.user.organizationId ? { organizationId: session.user.organizationId } : {})
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) {
    throw new Error("No organization membership found for this user");
  }

  return {
    id: membership.organizationId,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
    isPlatformAdmin
  };
}

export function scopedLeadWhere(organizationId: string, where: Prisma.LeadWhereInput = {}): Prisma.LeadWhereInput {
  return { AND: [{ organizationId }, where] };
}

export function scopedTaskWhere(organizationId: string, where: Prisma.TaskWhereInput = {}): Prisma.TaskWhereInput {
  return { AND: [{ organizationId }, where] };
}

export async function getOrganizationUsers(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    include: { user: true }
  });

  return memberships.map((membership) => membership.user);
}

export async function isOrganizationMember(userId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true }
  });

  return Boolean(membership);
}
