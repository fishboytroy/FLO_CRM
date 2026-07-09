import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/auth";
import { AddTerritoryForm, TerritoryStatusForm } from "@/components/territory-controls";
import { Badge, Card, EmptyState } from "@/components/ui";
import { getActiveOrganization } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canManageTerritories } from "@/lib/territory-zip-codes";

export const dynamic = "force-dynamic";

export default async function TerritorySettingsPage() {
  const session = await auth();
  const activeOrg = await getActiveOrganization();
  const canManage = canManageTerritories(activeOrg, session?.user.role);

  const territories = canManage
    ? await prisma.organizationZipCode.findMany({
        where: { organizationId: activeOrg.id },
        orderBy: [{ status: "asc" }, { zipCode: "asc" }]
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">Settings</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">ZIP code territories</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Manage purchased ZIP territories for {activeOrg.name}. These records do not route leads or control billing yet.
          </p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/dashboard/settings" prefetch={false}>
          Back to settings
        </Link>
      </div>

      {!canManage ? (
        <Card className="p-4 sm:p-6">
          <EmptyState title="Admin access required" description="Only organization owners and admins can manage ZIP territories." />
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Add territory</h3>
            <p className="mt-2 text-sm text-slate-400">ZIP+4 values are normalized to five digits. Active and trialing exclusive territories cannot overlap.</p>
            <div className="mt-5">
              <AddTerritoryForm />
            </div>
          </Card>

          <Card className="overflow-hidden">
            {territories.length ? (
              <>
                <div className="grid gap-3 p-4 md:hidden">
                  {territories.map((territory) => (
                    <div key={territory.id} className="rounded-lg border border-white/10 bg-obsidian-950/50 p-4 shadow-glass">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ZIP</p>
                          <p className="mt-1 text-lg font-bold text-white">{territory.zipCode}</p>
                        </div>
                        <Badge tone={territory.status === "active" ? "green" : territory.status === "trialing" ? "gold" : "neutral"}>{territory.status}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exclusive</span>
                          <span className="font-semibold text-slate-100">{territory.exclusive ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Starts</span>
                          <span className="font-semibold text-slate-100">{format(territory.startsAt, "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expires</span>
                          <span className="font-semibold text-slate-100">{territory.expiresAt ? format(territory.expiresAt, "MMM d, yyyy") : "-"}</span>
                        </div>
                        <TerritoryStatusForm id={territory.id} status={territory.status} />
                      </div>
                    </div>
                  ))}
                </div>
                <table className="hidden w-full text-left text-sm md:table">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">ZIP</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Exclusive</th>
                      <th className="px-4 py-3">Starts</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-300">
                    {territories.map((territory) => (
                      <tr key={territory.id} className="align-top hover:bg-white/5">
                        <td className="px-4 py-4 font-bold text-white">{territory.zipCode}</td>
                        <td className="px-4 py-4"><Badge tone={territory.status === "active" ? "green" : territory.status === "trialing" ? "gold" : "neutral"}>{territory.status}</Badge></td>
                        <td className="px-4 py-4">{territory.exclusive ? "Yes" : "No"}</td>
                        <td className="px-4 py-4">{format(territory.startsAt, "MMM d, yyyy")}</td>
                        <td className="px-4 py-4">{territory.expiresAt ? format(territory.expiresAt, "MMM d, yyyy") : "-"}</td>
                        <td className="px-4 py-4">{format(territory.updatedAt, "MMM d, yyyy")}</td>
                        <td className="px-4 py-4"><TerritoryStatusForm id={territory.id} status={territory.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-4 sm:p-6">
                <EmptyState title="No territories yet" description="Add the first ZIP territory for this organization." />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
