import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocSteps,
  DocCallout,
  DocNext,
} from "@/components/docs/doc-content";

export default function DocsAccountPage() {
  return (
    <DocPage
      title="Create account & workspace"
      subtitle="Set up your HopeChat account, name your workspace, and enter the dashboard in a few minutes."
    >
      <DocSection title="Before you start">
        <DocParagraph>
          All you need is an email address. HopeChat gives every new business a free trial, so
          you don&apos;t need a credit card or payment details to begin — those are handled later
          in the Billing section.
        </DocParagraph>
      </DocSection>

      <DocSection title="Steps">
        <DocSteps
          steps={[
            {
              title: "Create your account",
              body: (
                <DocParagraph>
                  Open the HopeChat website and click <b>Start Free Trial</b> (or go straight to
                  the Sign Up page). Enter your name, email address, and a password, then confirm
                  your email.
                </DocParagraph>
              ),
            },
            {
              title: "Name your workspace",
              body: (
                <DocParagraph>
                  After sign-up you&apos;ll land on the onboarding screen, which asks for your
                  business name (e.g. <b>Acme School</b> or <b>Kampala Boutique</b>). This name is
                  used across the dashboard and shown to your team. You can change it later from{" "}
                  <b>Settings → Profile</b>
                </DocParagraph>
              ),
            },
            {
              title: "Enter the dashboard",
              body: (
                <DocParagraph>
                  Click <b>Enter Dashboard</b>. This finishes onboarding and takes you to your
                  dashboard, where you&apos;ll see activity, response times, and quick actions. At
                  this point your workspace exists but no WhatsApp number is connected yet.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="What's next">
        <DocList
          items={[
            <span key="1">
              Connect your WhatsApp number — the biggest step — in the{" "}
              <a href="/docs/whatsapp" className="font-bold text-primary hover:underline">
                Connect WhatsApp guide
              </a>
            </span>,
            <span key="2">
              Invite your team so other agents can use the inbox:{" "}
              <a href="/docs/team" className="font-bold text-primary hover:underline">
                Team &amp; permissions
              </a>
            </span>,
            <span key="3">
              Build your first automation so customers get instant replies:{" "}
              <a href="/docs/automations" className="font-bold text-primary hover:underline">
                Automations
              </a>
            </span>,
          ]}
        />
      </DocSection>

      <DocCallout type="tip">
        Paused halfway through sign-up? No problem — you can resume any time, and our team sends a
        friendly reminder (easily opt-outable) plus a free guided setup session offer.
      </DocCallout>

      <DocNext
        href="/docs/whatsapp"
        title="Connect WhatsApp"
        description="Link your official WhatsApp Business number to start sending and receiving messages."
      />
    </DocPage>
  );
}