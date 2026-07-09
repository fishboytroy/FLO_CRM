import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createMemberInvite, sendMemberInviteEmail } from "@/lib/member-invites";
import { isPlatformAdminRole } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdminRole(session.user.role)) return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });

  const { id, userId } = await params;
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: id } },
    include: { user: true, organization: true }
  });
  if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  if (!membership.user.email) return NextResponse.json({ error: "Member does not have an email address" }, { status: 400 });

  const { invite, inviteUrl } = await createMemberInvite(prisma, {
    userId: membership.userId,
    organizationId: membership.organizationId,
    email: membership.user.email,
    role: membership.role
  });
  const inviteEmail = await sendMemberInviteEmail({
    to: { email: membership.user.email, name: membership.user.name },
    organizationName: membership.organization.name,
    role: membership.role,
    inviteUrl,
    expiresAt: invite.expiresAt
  });

  return NextResponse.json({ inviteEmail });
}
