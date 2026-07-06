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
  const visibleNav = activeOrg?.isPlatformAdmin ? [...nav, { href: "/dashboard/platform/organizations", label: "Platform" }] : nav;
  return (
    <>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-cypress text-white shadow-sm lg:hidden">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bayou-100">Lafayette</p>
              <p className="truncate text-base font-bold">Real Estate CRM</p>
            </div>
            <span className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/90 group-open:bg-white/10">Menu</span>
          </summary>
          <nav className="grid gap-1 border-t border-white/10 p-3">
            {visibleNav.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className="rounded-md px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-sm font-semibold">{session?.user?.name ?? session?.user?.email}</p>
            <p className="mt-1 truncate text-xs uppercase tracking-wide text-white/55">{activeOrg?.name ?? session?.user?.role}</p>
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="min-h-10 text-sm font-semibold text-bayou-100 hover:text-white">Sign out</button>
            </form>
          </div>
        </details>
      </div>

      <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-cypress text-white lg:flex">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bayou-100">Lafayette</p>
          <h1 className="mt-2 text-xl font-bold">Real Estate CRM</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false} className="block rounded-md px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
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
    </>
  );
}
