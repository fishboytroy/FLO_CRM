ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'platform_admin';

CREATE TYPE "OrganizationPlan" AS ENUM ('internal', 'individual', 'team');
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled');
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'agent');
CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'trialing', 'active', 'past_due', 'canceled');
CREATE TYPE "LeadDistributionStatus" AS ENUM ('unassigned', 'assigned', 'claimed', 'purchased', 'rejected', 'expired');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan" "OrganizationPlan" NOT NULL DEFAULT 'individual',
  "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'none',
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'agent',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "name", "slug", "plan", "status", "subscriptionStatus")
VALUES ('org_internal_lafayette', 'Lafayette Louisiana Real Estate', 'lafayette-louisiana-real-estate', 'internal', 'active', 'active')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Membership" ("id", "userId", "organizationId", "role")
SELECT 'mem_' || "id", "id", 'org_internal_lafayette',
  CASE WHEN "role" = 'admin' THEN 'owner'::"MembershipRole" ELSE 'agent'::"MembershipRole" END
FROM "User"
ON CONFLICT DO NOTHING;

ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_internal_lafayette';
ALTER TABLE "Lead" ADD COLUMN "distributionStatus" "LeadDistributionStatus" NOT NULL DEFAULT 'unassigned';
ALTER TABLE "Lead" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "exclusiveUntil" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "leadPriceCents" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "marketArea" TEXT;

ALTER TABLE "Task" ADD COLUMN "organizationId" TEXT;
UPDATE "Task" SET "organizationId" = "Lead"."organizationId" FROM "Lead" WHERE "Task"."leadId" = "Lead"."id";
UPDATE "Task" SET "organizationId" = 'org_internal_lafayette' WHERE "organizationId" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Activity" ADD COLUMN "organizationId" TEXT;
UPDATE "Activity" SET "organizationId" = "Lead"."organizationId" FROM "Lead" WHERE "Activity"."leadId" = "Lead"."id";
UPDATE "Activity" SET "organizationId" = 'org_internal_lafayette' WHERE "organizationId" IS NULL;
ALTER TABLE "Activity" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Lead" ALTER COLUMN "organizationId" DROP DEFAULT;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_plan_idx" ON "Organization"("plan");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE INDEX "Membership_role_idx" ON "Membership"("role");
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
CREATE INDEX "Lead_distributionStatus_idx" ON "Lead"("distributionStatus");
CREATE INDEX "Lead_marketArea_idx" ON "Lead"("marketArea");
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
