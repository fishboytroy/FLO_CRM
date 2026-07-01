import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getActiveOrganization } from "@/lib/access";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/pipeline", label: "Pipeline" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/settings", label: "Settings" }
];

export async function Sidebar() {
  const session = await auth();
  const activeOrg = session ? await getActiveOrganization() : null;
  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-cypress text-white">
      <div className="border-b border-white/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bayou-100">Lafayette</p>
        <h1 className="mt-2 text-xl font-bold">Real Estate CRM</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-md px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="text-sm font-semibold">{session?.user?.name ?? session?.user?.email}</p>
        <p className="text-xs uppercase tracking-wide text-white/50">{activeOrg?.name ?? session?.user?.role}</p>
        <form
          className="mt-3"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="text-sm font-semibold text-bayou-100 hover:text-white">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
