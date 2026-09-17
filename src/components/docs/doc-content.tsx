import Link from "next/link";
import { ArrowLeft, Lightbulb, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All guides
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground leading-relaxed font-medium">{subtitle}</p>}
      </header>
      <div className="space-y-8">{children}</div>
    </article>
  );
}

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function DocSubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function DocParagraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed font-medium">{children}</p>;
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed font-medium">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DocSteps({ steps }: { steps: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/20">
            {i + 1}
          </div>
          <div className="space-y-2 min-w-0">
            <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
            <div className="text-sm text-muted-foreground leading-relaxed font-medium space-y-2">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DocCallout({
  type = "note",
  children,
}: {
  type?: "tip" | "note" | "warning";
  children: React.ReactNode;
}) {
  const config = {
    tip: {
      icon: Lightbulb,
      classes: "border-primary/20 bg-primary/5 text-foreground",
      iconClass: "text-primary",
    },
    note: {
      icon: Info,
      classes: "border-border bg-background text-foreground",
      iconClass: "text-muted-foreground",
    },
    warning: {
      icon: TriangleAlert,
      classes: "border-amber-300 bg-amber-50 text-amber-900",
      iconClass: "text-amber-600",
    },
  }[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", config.classes)}>
      <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", config.iconClass)} />
      <div className="text-sm leading-relaxed font-medium">{children}</div>
    </div>
  );
}

export function DocCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[13px] font-semibold text-foreground">
      {children}
    </code>
  );
}

export function DocField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

export function DocNext({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background transition-colors hover:border-primary/30 hover:shadow-sm">
      <Link href={href} className="block p-5 space-y-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Next guide</p>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground font-medium">{description}</p>
      </Link>
    </div>
  );
}