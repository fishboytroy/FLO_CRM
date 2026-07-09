import clsx from "clsx";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("rounded-lg border border-white/10 bg-obsidian-900/72 shadow-glass backdrop-blur-xl", className)}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "gold" | "red" | "blue" }) {
  const tones = {
    neutral: "border border-white/10 bg-white/10 text-slate-200",
    green: "border border-aqua-400/30 bg-aqua-400/10 text-aqua-100",
    gold: "border border-gold/35 bg-gold/10 text-amber-100",
    red: "border border-ember-400/35 bg-ember-500/10 text-orange-100",
    blue: "border border-sky-400/30 bg-sky-400/10 text-sky-100"
  };
  return <span className={clsx("inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", tones[tone])}>{children}</span>;
}

export function Button({ children, className = "", variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-aqua-400 text-obsidian-950 shadow-glow hover:bg-aqua-300",
    secondary: "border border-white/10 bg-white/10 text-slate-100 hover:border-aqua-400/45 hover:bg-white/15",
    danger: "bg-ember-500 text-white hover:bg-ember-400"
  };
  return (
    <button className={clsx("min-h-11 rounded-md px-4 py-2 text-sm font-semibold transition", variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-8 text-center">
      <p className="font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
