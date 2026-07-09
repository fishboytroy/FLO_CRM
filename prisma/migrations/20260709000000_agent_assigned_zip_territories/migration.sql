ALTER TABLE "OrganizationZipCode" ADD COLUMN "assignedUserId" TEXT;

CREATE INDEX "OrganizationZipCode_assignedUserId_idx" ON "OrganizationZipCode"("assignedUserId");

ALTER TABLE "OrganizationZipCode" ADD CONSTRAINT "OrganizationZipCode_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
