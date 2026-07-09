import { redirect } from "next/navigation";
import { hashInviteToken, hashPassword, validatePassword } from "@/lib/member-invites";
import { prisma } from "@/lib/prisma";

type SetPasswordState = {
  error?: string;
  email?: string;
  organizationName?: string;
  token?: string;
};

async function getInvite(token?: string): Promise<SetPasswordState> {
  if (!token) return { error: "Invite token is missing." };

  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { organization: true, user: true }
  });

  if (!invite || invite.acceptedAt) return { error: "This invite link is invalid or has already been used." };
  if (invite.expiresAt <= new Date()) return { error: "This invite link has expired. Ask your admin to resend it." };

  return {
    token,
    email: invite.user.email,
    organizationName: invite.organization.name
  };
}

async function setPasswordAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const password = validatePassword(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password.success) {
    redirect(`/onboarding/set-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(password.error)}`);
  }
  if (password.password !== confirmPassword) {
    redirect(`/onboarding/set-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Passwords do not match")}`);
  }

  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: { id: true, userId: true, expiresAt: true, acceptedAt: true }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    redirect(`/onboarding/set-password?error=${encodeURIComponent("This invite link is invalid, expired, or already used.")}`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: { passwordHash: await hashPassword(password.password) }
    }),
    prisma.memberInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    })
  ]);

  redirect("/login?onboarding=complete");
}

export default async function SetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  const invite = await getInvite(params?.token);
  const error = params?.error ?? invite.error;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-obsidian-950 p-6 text-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,22,0.86),rgba(5,9,13,0.98)),url('/ai-command-center.png')] bg-cover bg-center opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(98,245,234,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(98,245,234,0.07)_1px,transparent_1px)] bg-[size:40px_40px] opacity-45" />
      <section className="relative w-full max-w-md rounded-lg border border-white/10 bg-obsidian-900/84 p-8 shadow-glass backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-aqua-100">FLO CRM Invite</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Set your password</h1>
        {invite.email && invite.organizationName ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Finish access for <span className="font-semibold text-white">{invite.email}</span> at <span className="font-semibold text-white">{invite.organizationName}</span>.
          </p>
        ) : null}
        {error ? <p className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {invite.token && !invite.error ? (
          <form action={setPasswordAction} className="mt-8 space-y-4">
            <input type="hidden" name="token" value={invite.token} />
            <div className="grid gap-2">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" required autoComplete="new-password" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
            </div>
            <button className="w-full rounded-md bg-aqua-400 px-4 py-3 text-sm font-bold text-obsidian-950 shadow-glow hover:bg-aqua-300">Save password</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
