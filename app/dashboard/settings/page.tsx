import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getActiveOrganization } from "@/lib/access";

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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">Settings</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">{organization.name}</h2>
      </div>
      <Card className="p-6">
        <h3 className="text-lg font-bold">Membership plan</h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-4">
          <Info label="Plan" value={organization.plan} />
          <Info label="Account status" value={organization.status} />
          <Info label="Subscription" value={organization.subscriptionStatus} />
          <Info label="Your role" value={activeOrg.role} />
        </dl>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-bold">Members</h3>
        <div className="mt-4 divide-y divide-slate-100">
          {organization.memberships.map((membership) => (
            <div key={membership.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold">{membership.user.name ?? membership.user.email}</p>
                <p className="text-slate-500">{membership.user.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{membership.role}</span>
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
      <dd className="mt-1 text-sm font-bold capitalize text-slate-900">{value.replaceAll("_", " ")}</dd>
    </div>
  );
}
