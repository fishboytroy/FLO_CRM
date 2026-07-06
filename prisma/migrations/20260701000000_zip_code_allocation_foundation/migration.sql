-- CreateEnum
CREATE TYPE "OrganizationZipCodeStatus" AS ENUM ('active', 'trialing', 'expired', 'canceled');

-- CreateEnum
CREATE TYPE "LeadAssignmentReason" AS ENUM ('zip_match', 'manual_assignment', 'reassignment', 'expired_zip', 'admin_override', 'unpurchased_zip');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "zipCode" TEXT;

-- CreateTable
CREATE TABLE "OrganizationZipCode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "status" "OrganizationZipCodeStatus" NOT NULL DEFAULT 'active',
    "exclusive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationZipCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignmentHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromOrganizationId" TEXT,
    "toOrganizationId" TEXT,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "zipCode" TEXT,
    "reason" "LeadAssignmentReason" NOT NULL,
    "message" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationZipCode_organizationId_idx" ON "OrganizationZipCode"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationZipCode_zipCode_idx" ON "OrganizationZipCode"("zipCode");

-- CreateIndex
CREATE INDEX "OrganizationZipCode_status_idx" ON "OrganizationZipCode"("status");

-- CreateIndex
CREATE INDEX "Lead_zipCode_idx" ON "Lead"("zipCode");

-- CreateIndex
CREATE INDEX "Lead_organizationId_zipCode_idx" ON "Lead"("organizationId", "zipCode");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_leadId_idx" ON "LeadAssignmentHistory"("leadId");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_zipCode_idx" ON "LeadAssignmentHistory"("zipCode");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_toOrganizationId_idx" ON "LeadAssignmentHistory"("toOrganizationId");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_toUserId_idx" ON "LeadAssignmentHistory"("toUserId");

-- CreateIndex
CREATE INDEX "LeadAssignmentHistory_createdAt_idx" ON "LeadAssignmentHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationZipCode" ADD CONSTRAINT "OrganizationZipCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_fromOrganizationId_fkey" FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_toOrganizationId_fkey" FOREIGN KEY ("toOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
