import { docsGroups } from "@/components/docs/nav";
import { DocPage, DocParagraph } from "@/components/docs/doc-content";

export default function DocsHomePage() {
  return (
    <DocPage
      title="Welcome to HopeChat"
      subtitle="The following guides walk you through setting up HopeChat for your business — from connecting your WhatsApp number to running your first automation."
    >
      <DocParagraph>
        You don&apos;t need any coding skills. Most businesses are fully up and running in under an
        hour: connect your official WhatsApp number, add your team, and build your first
        automation. Work through the guides in order — each one builds on the last.
      </DocParagraph>

      {docsGroups.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{group.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed font-medium">{item.description}</p>
                </a>
              );
            })}
          </div>
        </section>
      ))}

      <DocParagraph>
        Stuck at any step? The <a href="/docs/faq" className="font-bold text-primary hover:underline">FAQ &amp; troubleshooting guide</a> covers
        the most common problems, and you can always reach our team at{" "}
        <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">
          info@hopechat.net
        </a>
        .
      </DocParagraph>
    </DocPage>
  );
}