import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/sidebar";

export const metadata: Metadata = {
  title: {
    default: "Setup Guides",
    template: "%s — HopeChat Docs",
  },
  description: "Step-by-step guides for setting up HopeChat for your business.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="landing-light flex flex-col bg-white text-foreground antialiased font-sans selection:bg-primary/20 lg:flex-row">
      <DocsSidebar />
      <main className="flex-1 min-w-0 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 lg:px-0 lg:pt-12">
          {children}
        </div>
      </main>
    </div>
  );
}