CREATE TABLE "MemberInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberInvite_tokenHash_key" ON "MemberInvite"("tokenHash");
CREATE INDEX "MemberInvite_userId_idx" ON "MemberInvite"("userId");
CREATE INDEX "MemberInvite_organizationId_idx" ON "MemberInvite"("organizationId");
CREATE INDEX "MemberInvite_email_idx" ON "MemberInvite"("email");
CREATE INDEX "MemberInvite_expiresAt_idx" ON "MemberInvite"("expiresAt");

ALTER TABLE "MemberInvite" ADD CONSTRAINT "MemberInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInvite" ADD CONSTRAINT "MemberInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
