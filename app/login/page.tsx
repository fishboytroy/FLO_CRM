import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

async function loginAction(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=CredentialsSignin");
    }
    throw error;
  }
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const hasError = params?.error;
  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[1fr_520px]">
      <section className="relative hidden overflow-hidden bg-cypress p-12 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,163,127,0.35),transparent_35%),linear-gradient(135deg,rgba(23,54,47,0.95),rgba(11,59,50,0.98))]" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-bayou-100">Lafayette Louisiana Real Estate</p>
            <h1 className="mt-8 max-w-xl text-5xl font-bold leading-tight">Manage buyers, sellers, investors, and renters from first inquiry to closing.</h1>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm text-white/80">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Pipeline visibility</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Agent follow-up</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Local lead context</div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form action={loginAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-bayou-600">CRM Login</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">Welcome back</h2>
          {hasError ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Invalid email or password.</p> : null}
          <div className="mt-8 space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="admin@lafayettelouisianarealestate.com" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required placeholder="Password123!" />
            </div>
          </div>
          <button className="mt-6 w-full rounded-md bg-bayou-600 px-4 py-3 text-sm font-bold text-white hover:bg-bayou-700">Sign in</button>
        </form>
      </section>
    </main>
  );
}
