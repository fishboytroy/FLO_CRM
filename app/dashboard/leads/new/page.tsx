import { Card } from "@/components/ui";
import { LeadForm } from "@/components/lead-form";
import { getActiveOrganization, getOrganizationUsers } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const activeOrg = await getActiveOrganization();
  const agents = await getOrganizationUsers(activeOrg.id);
  const agentOptions = agents.map(({ id, name, email }) => ({ id, name, email }));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bayou-600">New Lead</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Add a Lafayette opportunity</h2>
      </div>
      <Card className="p-4 sm:p-6">
        <LeadForm agents={agentOptions} />
      </Card>
    </div>
  );
}
