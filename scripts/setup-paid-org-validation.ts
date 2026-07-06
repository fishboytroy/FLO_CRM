import { MembershipRole, OrganizationPlan, OrganizationStatus, OrganizationZipCodeStatus, PrismaClient, Role, SubscriptionStatus } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { normalizeTerritoryZipCode, TERRITORY_ACTIVE_STATUSES } from "../lib/territory-zip-codes";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type AccountConfig = {
  orgName: string;
  orgSlug: string;
  plan: OrganizationPlan;
  zipCode: string;
  members: {
    email: string;
    name: string;
    membershipRole: MembershipRole;
  }[];
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function normalizeZip(raw: string, name: string) {
  const normalized = normalizeTerritoryZipCode(raw);
  if (!normalized.success) throw new Error(`${name}: ${normalized.error}`);
  return normalized.zipCode;
}

function isProductionDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  return url.includes("supabase.co") || url.includes("pooler.supabase.com") || process.env.NODE_ENV === "production";
}

function buildConfig(): AccountConfig[] {
  const individualZip = normalizeZip(readEnv("PAID_VALIDATION_INDIVIDUAL_ZIP"), "PAID_VALIDATION_INDIVIDUAL_ZIP");
  const teamZip = normalizeZip(readEnv("PAID_VALIDATION_TEAM_ZIP"), "PAID_VALIDATION_TEAM_ZIP");

  return [
    {
      orgName: optionalEnv("PAID_VALIDATION_INDIVIDUAL_ORG_NAME", "Paid Validation Individual"),
      orgSlug: optionalEnv("PAID_VALIDATION_INDIVIDUAL_ORG_SLUG", "paid-validation-individual"),
      plan: OrganizationPlan.individual,
      zipCode: individualZip,
      members: [
        {
          email: readEnv("PAID_VALIDATION_INDIVIDUAL_OWNER_EMAIL").toLowerCase(),
          name: optionalEnv("PAID_VALIDATION_INDIVIDUAL_OWNER_NAME", "Paid Validation Individual Owner"),
          membershipRole: MembershipRole.owner
        }
      ]
    },
    {
      orgName: optionalEnv("PAID_VALIDATION_TEAM_ORG_NAME", "Paid Validation Team"),
      orgSlug: optionalEnv("PAID_VALIDATION_TEAM_ORG_SLUG", "paid-validation-team"),
      plan: OrganizationPlan.team,
      zipCode: teamZip,
      members: [
        {
          email: readEnv("PAID_VALIDATION_TEAM_OWNER_EMAIL").toLowerCase(),
          name: optionalEnv("PAID_VALIDATION_TEAM_OWNER_NAME", "Paid Validation Team Owner"),
          membershipRole: MembershipRole.owner
        },
        {
          email: readEnv("PAID_VALIDATION_TEAM_ADMIN_EMAIL").toLowerCase(),
          name: optionalEnv("PAID_VALIDATION_TEAM_ADMIN_NAME", "Paid Validation Team Admin"),
          membershipRole: MembershipRole.admin
        },
        {
          email: readEnv("PAID_VALIDATION_TEAM_AGENT_EMAIL").toLowerCase(),
          name: optionalEnv("PAID_VALIDATION_TEAM_AGENT_NAME", "Paid Validation Team Agent"),
          membershipRole: MembershipRole.agent
        }
      ]
    }
  ];
}

async function assertNoConflictingTerritories(configs: AccountConfig[]) {
  for (const config of configs) {
    const conflicts = await prisma.organizationZipCode.findMany({
      where: {
        zipCode: config.zipCode,
        exclusive: true,
        status: { in: [...TERRITORY_ACTIVE_STATUSES] },
        organization: { slug: { not: config.orgSlug } }
      },
      select: {
        id: true,
        zipCode: true,
        status: true,
        organization: { select: { name: true, slug: true } }
      }
    });

    if (conflicts.length) {
      const owners = conflicts.map((conflict) => `${conflict.organization.name} (${conflict.organization.slug})`).join(", ");
      throw new Error(`ZIP ${config.zipCode} already has an active/trialing exclusive territory: ${owners}`);
    }
  }
}

async function printPlan(configs: AccountConfig[]) {
  const existingOrgs = await prisma.organization.findMany({
    where: { slug: { in: configs.map((config) => config.orgSlug) } },
    select: { slug: true, name: true, plan: true, status: true, subscriptionStatus: true }
  });
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: configs.flatMap((config) => config.members.map((member) => member.email)) } },
    select: { email: true, name: true, role: true }
  });

  console.log("Paid organization validation setup plan:");
  for (const config of configs) {
    console.log(`- ${config.orgName} [${config.plan}] slug=${config.orgSlug} zip=${config.zipCode}`);
    for (const member of config.members) {
      console.log(`  - ${member.membershipRole}: ${member.email}`);
    }
  }
  console.log(`Existing matching organizations: ${existingOrgs.length}`);
  console.log(`Existing matching users: ${existingUsers.length}`);
}

async function upsertAccount(config: AccountConfig, passwordHash: string | null) {
  const organization = await prisma.organization.upsert({
    where: { slug: config.orgSlug },
    update: {
      name: config.orgName,
      plan: config.plan,
      status: OrganizationStatus.trialing,
      subscriptionStatus: SubscriptionStatus.trialing
    },
    create: {
      name: config.orgName,
      slug: config.orgSlug,
      plan: config.plan,
      status: OrganizationStatus.trialing,
      subscriptionStatus: SubscriptionStatus.trialing
    }
  });

  for (const member of config.members) {
    const existingUser = await prisma.user.findUnique({ where: { email: member.email } });
    if (!existingUser && !passwordHash) {
      throw new Error(`User ${member.email} does not exist. Set PAID_VALIDATION_PASSWORD to create missing users.`);
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: existingUser.name ?? member.name }
        })
      : await prisma.user.create({
          data: {
            name: member.name,
            email: member.email,
            passwordHash,
            role: Role.agent
          }
        });

    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { role: member.membershipRole },
      create: { userId: user.id, organizationId: organization.id, role: member.membershipRole }
    });
  }

  const existingTerritory = await prisma.organizationZipCode.findFirst({
    where: {
      organizationId: organization.id,
      zipCode: config.zipCode,
      exclusive: true,
      status: { in: [...TERRITORY_ACTIVE_STATUSES] }
    }
  });

  if (!existingTerritory) {
    await prisma.organizationZipCode.create({
      data: {
        organizationId: organization.id,
        zipCode: config.zipCode,
        status: OrganizationZipCodeStatus.trialing,
        exclusive: true
      }
    });
  }

  return organization;
}

async function main() {
  const configs = buildConfig();
  await assertNoConflictingTerritories(configs);
  await printPlan(configs);

  const writeEnabled = process.env.PAID_VALIDATION_ENABLE_WRITE === "1";
  if (!writeEnabled) {
    console.log("Dry run only. Set PAID_VALIDATION_ENABLE_WRITE=1 to create/update validation records.");
    return;
  }

  if (isProductionDatabase() && process.env.ALLOW_PRODUCTION_PAID_VALIDATION_SETUP !== "true") {
    throw new Error("Production-looking DATABASE_URL detected. Set ALLOW_PRODUCTION_PAID_VALIDATION_SETUP=true to allow this targeted setup.");
  }

  const password = process.env.PAID_VALIDATION_PASSWORD?.trim();
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  for (const config of configs) {
    const organization = await upsertAccount(config, passwordHash);
    console.log(`Ready: ${organization.name} (${organization.slug})`);
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
