import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { MembershipRole, PrismaClient } from "@prisma/client";
import { NotificationRecipient } from "@/lib/lead-notification-recipients";
import { EmailSendResult, brevoLeadEmailSender } from "@/lib/email/lead-notifications";

export const MEMBER_INVITE_EXPIRATION_HOURS = 72;
export const MIN_PASSWORD_LENGTH = 10;

type InviteDb = Pick<PrismaClient, "memberInvite">;

export type MemberInviteEmailPayload = {
  to: NotificationRecipient;
  organizationName: string;
  role: MembershipRole;
  inviteUrl: string;
  expiresAt: Date;
};

export function createInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function memberInviteUrl(token: string) {
  const baseUrl = process.env.CRM_APP_URL ?? process.env.AUTH_URL;
  if (!baseUrl) return `/onboarding/set-password?token=${encodeURIComponent(token)}`;
  return `${baseUrl.replace(/\/$/, "")}/onboarding/set-password?token=${encodeURIComponent(token)}`;
}

export function inviteExpirationDate(now = new Date()) {
  return new Date(now.getTime() + MEMBER_INVITE_EXPIRATION_HOURS * 60 * 60 * 1000);
}

export function validatePassword(raw: unknown) {
  if (typeof raw !== "string") return { success: false as const, error: "Password is required" };
  if (raw.length < MIN_PASSWORD_LENGTH) return { success: false as const, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  if (!/[A-Z]/.test(raw) || !/[a-z]/.test(raw) || !/\d/.test(raw)) {
    return { success: false as const, error: "Password must include uppercase, lowercase, and a number" };
  }
  return { success: true as const, password: raw };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

function roleLabel(role: MembershipRole) {
  if (role === MembershipRole.owner) return "Owner";
  if (role === MembershipRole.admin) return "Admin";
  return "Agent";
}

export function buildMemberInviteEmail({ to, organizationName, role, inviteUrl, expiresAt }: MemberInviteEmailPayload) {
  const roleName = roleLabel(role);
  const text = [
    `You have been invited to FLO CRM.`,
    ``,
    `Organization: ${organizationName}`,
    `Role: ${roleName}`,
    ``,
    `Set your password: ${inviteUrl}`,
    ``,
    `This invite expires on ${expiresAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}.`
  ].join("\n");

  const html = `
    <div>
      <p>You have been invited to <strong>FLO CRM</strong>.</p>
      <p><strong>Organization:</strong> ${organizationName}</p>
      <p><strong>Role:</strong> ${roleName}</p>
      <p><a href="${inviteUrl}">Set your password</a></p>
      <p>This invite expires on ${expiresAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}.</p>
    </div>
  `;

  return {
    to: [to],
    subject: `You have been invited to FLO CRM`,
    text,
    html
  };
}

export async function sendMemberInviteEmail(payload: MemberInviteEmailPayload): Promise<EmailSendResult> {
  return brevoLeadEmailSender(buildMemberInviteEmail(payload));
}

export async function createMemberInvite(db: InviteDb, input: {
  userId: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  now?: Date;
}) {
  const token = createInviteToken();
  const expiresAt = inviteExpirationDate(input.now);
  const invite = await db.memberInvite.create({
    data: {
      tokenHash: hashInviteToken(token),
      userId: input.userId,
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      expiresAt
    }
  });

  return { invite, token, inviteUrl: memberInviteUrl(token) };
}
