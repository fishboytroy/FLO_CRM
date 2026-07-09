import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getActiveOrganization } from "@/lib/access";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/dashboard/leads", label: "Leads", icon: "◇" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "▽" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "✓" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" }
];

export async function Sidebar() {
  const session = await auth();
  const activeOrg = session ? await getActiveOrganization() : null;
  const visibleNav = activeOrg?.isPlatformAdmin ? [...nav, { href: "/dashboard/platform/organizations", label: "Platform", icon: "✣" }] : nav;
  return (
    <>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-obsidian-950/90 text-white shadow-glass backdrop-blur-xl lg:hidden">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md border border-gold/30 bg-gold/10 text-xl text-gold">✦</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Lafayette</p>
                <p className="truncate text-base font-bold">Real Estate CRM</p>
              </div>
            </div>
            <span className="rounded-md border border-aqua-400/25 bg-aqua-400/10 px-3 py-2 text-sm font-semibold text-aqua-100 group-open:bg-aqua-400/15">Menu</span>
          </summary>
          <nav className="grid gap-1 border-t border-white/10 p-3">
            {visibleNav.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className="flex min-h-11 items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-white/80 hover:bg-aqua-400/10 hover:text-white">
                <span className="grid size-7 place-items-center rounded-md border border-white/10 bg-white/5 text-aqua-100">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-sm font-semibold">{session?.user?.name ?? session?.user?.email}</p>
            <p className="mt-1 truncate text-xs uppercase tracking-wide text-white/60">{activeOrg?.name ?? session?.user?.role}</p>
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="min-h-10 text-sm font-semibold text-aqua-100 hover:text-white">Sign out</button>
            </form>
          </div>
        </details>
      </div>

      <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-obsidian-950/80 text-white shadow-glass backdrop-blur-xl lg:flex">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-gold/35 bg-gold/10 text-2xl text-gold shadow-glow">✦</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Lafayette</p>
              <h1 className="mt-1 text-xl font-bold">Real Estate CRM</h1>
            </div>
          </div>
          <p className="mt-5 rounded-md border border-aqua-400/20 bg-aqua-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-aqua-100">AI lead command</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false} className="flex min-h-12 items-center gap-3 rounded-md border border-transparent px-3 py-3 text-sm font-semibold text-white/80 transition hover:border-aqua-400/20 hover:bg-aqua-400/10 hover:text-white">
              <span className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/5 text-aqua-100">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold text-white">{session?.user?.name ?? session?.user?.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/50">{activeOrg?.name ?? session?.user?.role}</p>
          <form
            className="mt-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm font-semibold text-aqua-100 hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
    </>
  );
}
