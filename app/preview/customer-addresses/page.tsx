import { Badge, Card } from "@/components/ui";
import { LeadForm } from "@/components/lead-form";

const previewLead = {
  id: "preview",
  firstName: "Jordan",
  lastName: "Broussard",
  email: "jordan@example.com",
  phone: "337-555-0184",
  leadType: "buyer" as const,
  status: "qualified" as const,
  source: "Personal referral",
  assignedAgentId: null,
  budgetMin: 300000,
  budgetMax: 425000,
  desiredLocation: "Lafayette or Youngsville",
  addressLine1: "101 Main Street",
  addressLine2: "Suite 200",
  addressCity: "Lafayette",
  addressState: "LA",
  addressPostalCode: "70501",
  zipCode: "70508",
  propertyInterest: "Single-family home",
  timeframe: "Next 90 days",
  notes: "Preview customer record"
};

export default function CustomerAddressPreviewPage() {
  return (
    <main className="min-h-screen bg-obsidian-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-amber-100">
          <p className="font-bold">Customer address preview</p>
          <p className="mt-1">This demonstration is read-only. No customer or routing data can be changed here.</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aqua-100">Lead Detail</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Jordan Broussard</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">Buyer</Badge>
            <Badge tone="blue">Qualified</Badge>
            <Badge tone="gold">Personal referral</Badge>
          </div>
        </div>

        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-white">Lead profile</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Email" value={previewLead.email} />
            <Info label="Phone" value={previewLead.phone} />
            <Info label="Agent" value="Alex Martin" />
            <Info label="Location" value={previewLead.desiredLocation} />
            <Info label="Allocation ZIP" value={previewLead.zipCode} />
            <Info label="Budget" value="$300,000 - $425,000" />
            <Info
              label="Customer address"
              value="101 Main Street · Suite 200 · Lafayette, LA 70501"
              className="sm:col-span-2 lg:col-span-3"
            />
          </dl>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-white">Edit lead</h2>
          <div className="pointer-events-none mt-5" aria-disabled="true">
            <LeadForm agents={[{ id: "alex", name: "Alex Martin", email: "alex@example.com" }]} lead={previewLead} />
          </div>
        </Card>
      </div>
    </main>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
