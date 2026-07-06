import { format } from "date-fns";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  AddOrganizationMemberForm,
  AssignOrganizationTerritoryForm,
  CreateOrganizationForm
} from "@/components/platform-organization-controls";
import { Badge, Card, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { isPlatformAdminRole } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "active") return "green";
  if (status === "trialing") return "gold";
  if (status === "past_due") return "red";
  return "neutral";
}

export default async function PlatformOrganizationsPage() {
  const session = await auth();
  if (!session || !isPlatformAdminRole(session.user.role)) notFound();

  const organizations = await prisma.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      memberships: {
        orderBy: [{ role: "asc" }, { user: { email: "asc" } }],
        include: { user: true }
      },
      zipCodes: {
        orderBy: [{ status: "asc" }, { zipCode: "asc" }]
      },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          zipCode: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          memberships: true,
          zipCodes: true,
          leads: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">Platform</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Organizations</h2>
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">Create organization</h3>
        <div className="mt-5">
          <CreateOrganizationForm />
        </div>
      </Card>

      {organizations.length ? (
        <div className="space-y-5">
          {organizations.map((organization) => (
            <Card key={organization.id} className="overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-bold text-slate-900">{organization.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{organization.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{organization.plan}</Badge>
                    <Badge tone={statusTone(organization.status)}>{organization.status}</Badge>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{organization._count.memberships}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ZIP territories</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{organization._count.zipCodes}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leads</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{organization._count.leads}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</p>
                    <p className="mt-1 font-bold text-slate-900">{format(organization.createdAt, "MMM d, yyyy")}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-2">
                <section className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900">Members</h4>
                    <div className="mt-3">
                      <AddOrganizationMemberForm organizationId={organization.id} />
                    </div>
                  </div>
                  {organization.memberships.length ? (
                    <div className="overflow-hidden rounded-md border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {organization.memberships.map((membership) => (
                            <tr key={membership.id}>
                              <td className="px-3 py-3">
                                <p className="font-semibold text-slate-900">{membership.user.name ?? "Unnamed user"}</p>
                                <p className="break-all text-xs text-slate-500">{membership.user.email}</p>
                              </td>
                              <td className="px-3 py-3"><Badge>{membership.role}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="No members" description="Add an owner, admin, or agent membership." />
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900">ZIP territories</h4>
                    <div className="mt-3">
                      <AssignOrganizationTerritoryForm organizationId={organization.id} />
                    </div>
                  </div>
                  {organization.zipCodes.length ? (
                    <div className="overflow-hidden rounded-md border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">ZIP</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Exclusive</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {organization.zipCodes.map((territory) => (
                            <tr key={territory.id}>
                              <td className="px-3 py-3 font-bold text-slate-900">{territory.zipCode}</td>
                              <td className="px-3 py-3"><Badge tone={territory.status === "active" ? "green" : territory.status === "trialing" ? "gold" : "neutral"}>{territory.status}</Badge></td>
                              <td className="px-3 py-3">{territory.exclusive ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="No ZIP territories" description="Assign an unused active ZIP for validation." />
                  )}
                </section>
              </div>

              <div className="border-t border-slate-100 p-4 sm:p-6">
                <h4 className="font-bold text-slate-900">Recent leads</h4>
                {organization.leads.length ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {organization.leads.map((lead) => (
                      <div key={lead.id} className="rounded-md border border-slate-200 p-3 text-sm">
                        <p className="font-bold text-slate-900">{lead.firstName} {lead.lastName}</p>
                        <p className="mt-1 text-slate-500">ZIP {lead.zipCode ?? "-"}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>{lead.status}</Badge>
                          <span className="text-xs font-semibold text-slate-400">{format(lead.createdAt, "MMM d")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No recent leads.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4 sm:p-6">
          <EmptyState title="No organizations" description="Create the first validation organization." />
        </Card>
      )}
    </div>
  );
}
