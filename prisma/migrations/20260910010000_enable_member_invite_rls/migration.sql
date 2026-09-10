-- MemberInvite is server-only and contains sensitive invitation token hashes.
-- No anon or authenticated policies are intentionally defined; RLS defaults them to no row access.
-- The CRM's server-side postgres/service_role connections retain access because they bypass RLS.
ALTER TABLE "public"."MemberInvite" ENABLE ROW LEVEL SECURITY;
