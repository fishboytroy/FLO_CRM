import { MembershipRole, OrganizationPlan, PrismaClient } from "@prisma/client";

export type NotificationUser = {
  id: string;
  email: string | null;
  name?: string | null;
};

export type NotificationMembership = {
  role: MembershipRole;
  user: NotificationUser;
};

export type NotificationOrganization = {
  id: string;
  plan: OrganizationPlan;
  memberships: NotificationMembership[];
};

type RecipientDb = Pick<PrismaClient, "user" | "organization">;

export type NotificationRecipient = {
  email: string;
  name?: string | null;
};

export function uniqueRecipients(users: NotificationUser[]) {
  const seen = new Set<string>();
  const recipients: NotificationRecipient[] = [];

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name: user.name });
  }

  return recipients;
}

export function selectLeadNotificationRecipients(organization: NotificationOrganization, assignedUser?: NotificationUser | null, fallbackEmail?: string) {
  if (assignedUser?.email) return uniqueRecipients([assignedUser]);

  const ownerAdminUsers = organization.memberships
    .filter((membership) => membership.role === MembershipRole.owner || membership.role === MembershipRole.admin)
    .map((membership) => membership.user);

  const recipients = uniqueRecipients(ownerAdminUsers);
  const fallback = fallbackEmail?.trim().toLowerCase();

  if (!recipients.length && fallback) return [{ email: fallback }];
  return recipients;
}

export async function getLeadNotificationRecipients(db: RecipientDb, organizationId: string, assignedAgentId?: string | null, fallbackEmail = process.env.CRM_NOTIFICATION_FALLBACK_EMAIL) {
  const [organization, assignedUser] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        plan: true,
        memberships: {
          where: { role: { in: [MembershipRole.owner, MembershipRole.admin] } },
          include: { user: { select: { id: true, email: true, name: true } } }
        }
      }
    }),
    assignedAgentId ? db.user.findFirst({ where: { id: assignedAgentId }, select: { id: true, email: true, name: true } }) : Promise.resolve(null)
  ]);

  if (!organization) return fallbackEmail ? [{ email: fallbackEmail.trim().toLowerCase() }] : [];
  return selectLeadNotificationRecipients(organization as NotificationOrganization, assignedUser, fallbackEmail);
}
