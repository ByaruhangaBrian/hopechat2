import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the HopeChat WhatsApp CRM and automation platform, provided by HopeTech Solutions Ltd.",
  robots: {
    index: true,
    follow: true,
  },
};

const VERSION = "v1";
const UPDATED = "8 October 2026";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed font-medium">
      {children}
    </p>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed font-medium"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <div className="landing-light flex min-h-screen flex-col bg-white text-foreground antialiased font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">HopeChat</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <header className="space-y-3 mb-10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              Version {VERSION} · Last updated {UPDATED}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <strong className="text-amber-900">Draft — not legal advice.</strong>{" "}
              <span className="text-amber-800">
                This document is a baseline prepared for internal review. Have it reviewed by
                qualified legal counsel before presenting it to customers as a binding contract.
              </span>
            </p>
          </header>

          <div className="space-y-8">
            <Section title="1. Who we are">
              <Paragraph>
                HopeChat is a WhatsApp CRM, automation, and messaging platform operated by{" "}
                <strong className="text-foreground">HopeTech Solutions Ltd</strong>, Uganda
                (contactable at{" "}
                <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">
                  info@hopechat.net
                </a>{" "}
                or +256 763 149 276). These Terms govern your use of the HopeChat software,
                website, and related services (the &ldquo;Service&rdquo;).
              </Paragraph>
            </Section>

            <Section title="2. Accounts & eligibility">
              <Paragraph>
                You must be at least 18 years old and authorised to bind the organisation you
                represent. You are responsible for safeguarding your account credentials and for
                all activity that occurs under your account. Where you add team members, you are
                responsible for the permissions you grant them.
              </Paragraph>
            </Section>

            <Section title="3. WhatsApp, Meta, and third-party services">
              <Paragraph>
                The Service connects to the official WhatsApp Business API and other third-party
                services (including Meta, Google Sheets, Cal.com, Pesapal, and SMS gateways). Your
                use of those services is also subject to their own terms, and we are not a party to
                your contract with them. You are responsible for complying with WhatsApp
                Business / Meta policies when you send messages, and for obtaining any consent from
                your end customers that those policies or applicable law require.
              </Paragraph>
            </Section>

            <Section title="4. Your content">
              <Paragraph>
                You retain all rights to the business data you upload — contacts, messages,
                templates, documents, and configuration. You grant us a limited licence to process
                that data solely to operate and improve the Service for you. You confirm that you
                have the right to provide us this data and that doing so does not breach any law,
                contract, or person&apos;s rights.
              </Paragraph>
            </Section>

            <Section title="5. Acceptable use">
              <Paragraph>You agree not to use the Service to:</Paragraph>
              <List
                items={[
                  <span key="1">Send unsolicited commercial messages (spam) or messages without the recipient&apos;s consent where consent is required;</span>,
                  <span key="2">Distribute unlawful, defamatory, deceptive, or harmful content;</span>,
                  <span key="3">Circumvent limits, abuse API access, or interfere with other users&apos; accounts;</span>,
                  <span key="4">Attempt unauthorised access to the Service, our infrastructure, or any third-party system.</span>,
                ]}
              />
            </Section>

            <Section title="6. Billing, payments & refunds">
              <Paragraph>
                Paid plans and credit top-ups require an active payment method and are charged in
                Uganda Shillings (UGX) through Pesapal (Mobile Money or card). Plan features,
                credit prices, and usage are shown in your dashboard&apos;s Billing section.
              </Paragraph>
            </Section>

            <Section
              id="refunds"
              title="7. Refund Policy"
            >
              <Paragraph>
                We want you to be confident in the Service before you commit.
              </Paragraph>
              <List
                items={[
                  <span key="1"><strong className="text-foreground">Free trial:</strong> every plan begins with a free trial. No payment is taken during the trial, and you can stop using the Service at any time without charge.</span>,
                  <span key="2"><strong className="text-foreground">First billing cycle:</strong> if you purchased a paid plan and the Service does not work as described, contact{" "}
                    <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">info@hopechat.net</a>{" "}
                    within 14 days of the first charge for a full refund of that first cycle.</span>,
                  <span key="3"><strong className="text-foreground">Credits:</strong> refunds for unused message/test credits are considered on a case-by-case basis where credits were purchased in error or the Service was unavailable, and are subject to reasonably verifiable usage.</span>,
                  <span key="4"><strong className="text-foreground">Renewals:</strong> payments for renewed periods are refundable only where the Service was materially unavailable during that period.</span>,
                  <span key="5"><strong className="text-foreground">How to request:</strong> email{" "}
                    <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">info@hopechat.net</a>{" "}
                    with your account details and the reason for the request. We aim to respond within 5 business days and, where approved, to issue the refund to your original payment method within 10 business days.</span>,
                ]}
              />
            </Section>

            <Section title="8. Service availability & changes">
              <Paragraph>
                We aim for high availability but do not guarantee uninterrupted or error-free
                operation. We may modify, suspend, or discontinue features, and may update these
                Terms from time to time; continued use after updates constitutes acceptance.
                Where changes are material, we will take reasonable steps to notify you (for
                example, by requiring consent to updated versions).
              </Paragraph>
            </Section>

            <Section title="9. Disclaimers & limitation of liability">
              <Paragraph>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
                warranties of any kind, whether express or implied. To the maximum extent permitted
                by law, HopeTech Solutions Ltd will not be liable for indirect, incidental,
                consequential, or punitive damages, or for loss of profits, data, or goodwill. Our
                total liability for any claim arising from or relating to the Service is limited to
                the amount you paid us in the three (3) months preceding the claim.
              </Paragraph>
            </Section>

            <Section title="10. Termination">
              <Paragraph>
                You may stop using the Service at any time. We may suspend or terminate access for
                abuse, non-payment, or breach of these Terms. On termination, access to your data
                will cease, and you should export anything you need beforehand. Data is deleted or
                anonymised in line with our Privacy Policy and applicable retention limits.
              </Paragraph>
            </Section>

            <Section title="11. Governing law">
              <Paragraph>
                These Terms are governed by the laws of the Republic of Uganda, and any disputes
                are subject to the exclusive jurisdiction of the courts of Uganda.
              </Paragraph>
            </Section>
          </div>

          <footer className="pt-10 border-t border-border mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>Version {VERSION} · Last updated {UPDATED} · HopeChat by HopeTech Solutions Ltd.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}