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

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; onboarding?: string }> }) {
  const params = await searchParams;
  const hasError = params?.error;
  const onboardingComplete = params?.onboarding === "complete";
  return (
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-obsidian-950 text-slate-100 lg:grid-cols-[1fr_520px]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,22,0.86),rgba(5,9,13,0.98)),url('/ai-command-center.png')] bg-cover bg-center opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(98,245,234,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(98,245,234,0.07)_1px,transparent_1px)] bg-[size:40px_40px] opacity-45" />
      <section className="relative hidden overflow-hidden p-12 text-white lg:block">
        <div className="absolute inset-0 bg-obsidian-950/35" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold">Lafayette Louisiana Real Estate</p>
            <h1 className="mt-8 max-w-xl text-5xl font-bold leading-tight">Lead intelligence from first inquiry to closing.</h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">Monitor pipeline movement, routing status, follow-up load, and review queues from one command center.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-200">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">Pipeline visibility</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">Agent follow-up</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">Local lead context</div>
          </div>
        </div>
      </section>
      <section className="relative flex items-center justify-center p-6">
        <form action={loginAction} className="w-full max-w-md rounded-lg border border-white/10 bg-obsidian-900/80 p-8 shadow-glass backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-aqua-100">CRM Login</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Welcome back</h2>
          {onboardingComplete ? <p className="mt-4 rounded-md border border-aqua-400/30 bg-aqua-400/10 p-3 text-sm text-aqua-100">Password saved. Sign in with your email and new password.</p> : null}
          {hasError ? <p className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">Invalid email or password.</p> : null}
          <div className="mt-8 space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="admin@lafayettelouisianarealestate.com" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required placeholder="Enter your password" />
            </div>
          </div>
          <button className="mt-6 w-full rounded-md bg-aqua-400 px-4 py-3 text-sm font-bold text-obsidian-950 shadow-glow hover:bg-aqua-300">Sign in</button>
        </form>
      </section>
    </main>
  );
}
