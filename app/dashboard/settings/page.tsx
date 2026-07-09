import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/access";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const activeOrg = await getActiveOrganization();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: activeOrg.id },
    include: { memberships: { include: { user: true }, orderBy: { role: "asc" } } }
  });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">Settings</p>
        <h2 className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{organization.name}</h2>
      </div>
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white">Membership plan</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Plan" value={organization.plan} />
          <Info label="Account status" value={organization.status} />
          <Info label="Subscription" value={organization.subscriptionStatus} />
          <Info label="Your role" value={activeOrg.role} />
        </dl>
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white">ZIP code territories</h3>
        <p className="mt-2 text-sm text-slate-400">Manage purchased ZIP territories for this organization. Routing and billing are not active yet.</p>
        <Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-aqua-400 px-4 py-2 text-sm font-semibold text-obsidian-950 shadow-glow hover:bg-aqua-300 sm:w-auto" href="/dashboard/settings/territories" prefetch={false}>
          Manage territories
        </Link>
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white">Members</h3>
        <div className="mt-4 divide-y divide-white/10">
          {organization.memberships.map((membership) => (
            <div key={membership.id} className="grid gap-2 py-3 text-sm sm:flex sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{membership.user.name ?? membership.user.email}</p>
                <p className="break-words text-slate-500">{membership.user.email}</p>
              </div>
              <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase text-slate-200">{membership.role}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold capitalize text-white">{value.replaceAll("_", " ")}</dd>
    </div>
  );
}
