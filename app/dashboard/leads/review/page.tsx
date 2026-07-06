import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { labelFor, leadTypes } from "@/lib/crm";
import { getActiveOrganization } from "@/lib/access";
import { reviewLeadWhere, reviewReasonLabel, isReviewAssignment } from "@/lib/review-leads";

export const dynamic = "force-dynamic";

export default async function ReviewLeadsPage() {
  const activeOrg = await getActiveOrganization();
  const leads = await prisma.lead.findMany({
    where: reviewLeadWhere(activeOrg.id),
    orderBy: { createdAt: "desc" },
    include: {
      organization: true,
      assignedAgent: true,
      assignmentHistory: { orderBy: { createdAt: "desc" } }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">{activeOrg.name}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Manual review leads</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Leads here were not confidently routed by ZIP, or need owner-assignment review. Open a lead to add notes, create follow-up tasks, or move its pipeline stage.
          </p>
        </div>
        <Link href="/dashboard/leads" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to leads
        </Link>
      </div>

      <Card className="overflow-hidden">
        {leads.length ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {leads.map((lead) => {
                const reviewAssignment = lead.assignmentHistory.find(isReviewAssignment);
                return (
                  <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} prefetch={false} className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{lead.firstName} {lead.lastName}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact info"}</p>
                      </div>
                      <Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">ZIP</span>
                        <span className="font-semibold text-slate-800">{lead.zipCode ?? "No ZIP"}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</p>
                        <div className="mt-1">
                          <Badge tone={reviewAssignment?.reason === "admin_override" ? "red" : "gold"}>{reviewReasonLabel(reviewAssignment)}</Badge>
                        </div>
                        {reviewAssignment?.message ? <p className="mt-2 break-words text-xs text-slate-500">{reviewAssignment.message}</p> : null}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</span>
                        <span className="font-semibold text-slate-800">{format(lead.createdAt, "MMM d, yyyy")}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</p>
                        <p className="mt-1 break-words text-slate-700">{lead.source ?? "No source"}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">ZIP</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const reviewAssignment = lead.assignmentHistory.find(isReviewAssignment);
                  return (
                    <tr key={lead.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact info"}</p>
                      </td>
                      <td className="px-4 py-4"><Badge tone="green">{labelFor(leadTypes, lead.leadType)}</Badge></td>
                      <td className="px-4 py-4">{lead.zipCode ?? "No ZIP"}</td>
                      <td className="px-4 py-4">
                        <Badge tone={reviewAssignment?.reason === "admin_override" ? "red" : "gold"}>{reviewReasonLabel(reviewAssignment)}</Badge>
                        {reviewAssignment?.message ? <p className="mt-2 max-w-xs text-xs text-slate-500">{reviewAssignment.message}</p> : null}
                      </td>
                      <td className="px-4 py-4">{lead.source ?? "No source"}</td>
                      <td className="px-4 py-4">{lead.organization.name}</td>
                      <td className="px-4 py-4">{lead.assignedAgent?.name ?? "Unassigned"}</td>
                      <td className="px-4 py-4">{format(lead.createdAt, "MMM d, yyyy")}</td>
                      <td className="px-4 py-4">
                        <Link href={`/dashboard/leads/${lead.id}`} prefetch={false} className="font-semibold text-bayou-700 hover:text-bayou-800">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="p-4 sm:p-6">
            <EmptyState title="No leads need review" description="Fallback and unmatched ZIP leads for this organization will appear here." />
          </div>
        )}
      </Card>
    </div>
  );
}
