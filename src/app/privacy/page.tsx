import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How HopeChat by HopeTech Solutions Ltd collects, uses, and protects your data — including contacts, messages, payments, IP/geo, and AI processing.",
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

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <strong className="text-amber-900">Draft — not legal advice.</strong>{" "}
              <span className="text-amber-800">
                This document is a baseline prepared for internal review. Have it reviewed by
                qualified legal counsel before presenting it to customers.
              </span>
            </p>
          </header>

          <div className="space-y-8">
            <Section title="1. Who processes your data">
              <Paragraph>
                <strong className="text-foreground">HopeTech Solutions Ltd</strong> (Uganda) operates
                HopeChat and acts as the controller (and, where you use the Service to manage your
                own customers&apos; data, as a processor acting on your behalf). Contact:{" "}
                <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">
                  info@hopechat.net
                </a>{" "}
                · +256 763 149 276.
              </Paragraph>
            </Section>

            <Section title="2. Data we collect">
              <List
                items={[
                  <span key="1"><strong className="text-foreground">Account data:</strong> your name, email address, phone number, business name, and role/permissions within your workspace.</span>,
                  <span key="2"><strong className="text-foreground">Content you add:</strong> contacts, conversation messages, templates, uploaded documents, tags, automation configuration, and settings.</span>,
                  <span key="3"><strong className="text-foreground">Connection metadata:</strong> for sessions — IP address, approximate location (city/country derived from IP), device and browser information, and pages visited. This is collected for security, support, and abuse prevention.</span>,
                  <span key="4"><strong className="text-foreground">Payment information:</strong> transaction references and amounts when you pay through Pesapal. We do not store full card numbers — card details are handled by the payment provider.</span>,
                  <span key="5"><strong className="text-foreground">Usage data:</strong> product usage, activity events, and diagnostic logs used to operate and improve the Service.</span>,
                ]}
              />
            </Section>

            <Section title="3. How we use your data">
              <List
                items={[
                  <span key="1">Provide, operate, and secure the Service;</span>,
                  <span key="2">Send WhatsApp and SMS messages on your behalf through the official WhatsApp Business API and your SMS gateway;</span>,
                  <span key="3">Answer customer questions using AI (see section 5);</span>,
                  <span key="4">Process payments and manage credits;</span>,
                  <span key="5">Provide support, detect abuse, and comply with legal obligations.</span>,
                ]}
              />
            </Section>

            <Section title="4. Legal basis">
              <Paragraph>
                We process data on the basis of: your consent (which you may withdraw at any time);
                the performance of a contract with you; our legitimate interests in operating and
                securing the Service; and compliance with legal obligations. Where consent is
                required for your own end-customers&apos; data (for example, WhatsApp opt-in), that
                is your responsibility as the account holder.
              </Paragraph>
            </Section>

            <Section title="5. AI processing">
              <Paragraph>
                HopeChat&apos;s AI assistant may send parts of a conversation (or your uploaded
                knowledge base and connected spreadsheet data) to an AI provider to generate a
                reply. We use Google Gemini. Where you have connected a Google Sheet, sheet data
                may be shared with the AI provider solely to answer live lookup questions. We do
                not sell your data to AI providers, and the provider is bound to use it only to
                generate responses. Messages sent to Meta&apos;s WhatsApp API are handled
                according to Meta&apos;s own policies.
              </Paragraph>
            </Section>

            <Section title="6. Third parties we share data with">
              <List
                items={[
                  <span key="1"><strong className="text-foreground">Meta / WhatsApp Business API:</strong> for messaging, per Meta&apos;s terms;</span>,
                  <span key="2"><strong className="text-foreground">Google (Gemini, Google Sheets):</strong> for AI answers and spreadsheet integrations;</span>,
                  <span key="3"><strong className="text-foreground">Pesapal:</strong> for payment processing;</span>,
                  <span key="4"><strong className="text-foreground">Cal.com:</strong> for appointment booking;</span>,
                  <span key="5"><strong className="text-foreground">SMS gateways:</strong> for bulk SMS delivery;</span>,
                  <span key="6"><strong className="text-foreground">Hosting & infrastructure providers</strong> that store or transmit data on our behalf, bound by confidentiality.</span>,
                ]}
              />
              <Paragraph>
                We only share the minimum data each provider needs, and never sell personal data.
              </Paragraph>
            </Section>

            <Section title="7. Data retention">
              <Paragraph>
                We keep account and content data for as long as your account is active or as needed
                to provide the Service. Session location data is retained for a limited period for
                security purposes. Credit and payment records are kept to meet financial and tax
                obligations. You can request deletion of your data at any time (see section 10).
              </Paragraph>
            </Section>

            <Section title="8. Security">
              <Paragraph>
                We apply protections including encryption of data in transit and sensitive fields at
                rest, access controls, and monitoring of sessions for suspicious activity. No method
                of transmission or storage is completely secure, and we cannot guarantee absolute
                security.
              </Paragraph>
            </Section>

            <Section title="9. Cookies & local storage">
              <Paragraph>
                We use essential cookies and local storage for authentication and session
                management, PWA installation, and to remember preferences. We do not use
                third-party advertising cookies.
              </Paragraph>
            </Section>

            <Section title="10. Your rights">
              <Paragraph>
                Subject to applicable law, you may request access to, correction of, or deletion of
                your personal data, withdraw consent, and object to or restrict processing. To
                exercise any of these rights, email{" "}
                <a href="mailto:info@hopechat.net" className="font-bold text-primary hover:underline">
                  info@hopechat.net
                </a>
                . We respond within a reasonable period and will verify your identity first.
              </Paragraph>
            </Section>

            <Section title="11. Changes to this policy">
              <Paragraph>
                We will notify you of material changes — for example, by updating the version
                stamp, and, where our terms require consent, by asking you to accept the updated
                version. The version and last-updated date are shown at the top of this page.
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