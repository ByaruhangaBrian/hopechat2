import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocSteps,
  DocCallout,
  DocField,
  DocNext,
} from "@/components/docs/doc-content";

export default function DocsTemplatesPage() {
  return (
    <DocPage
      title="Message templates"
      subtitle="Create WhatsApp message templates, get them approved by Meta, and use them in broadcasts and automation replies."
    >
      <DocSection title="What are templates?">
        <DocParagraph>
          WhatsApp requires pre-approved templates for any message you initiate (outbound) —
          broadcasts, automation replies, and follow-ups. They don&apos;t apply to messages
          a customer sends you first. Each template has a category, a language code, and a
          body with optional variables.
        </DocParagraph>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocField label="Marketing" value="Promotions, announcements, offers" />
          <DocField label="Utility" value="Account updates, alerts, reminders" />
          <DocField label="Authentication" value="One-time passwords and verification codes" />
        </div>
      </DocSection>

      <DocSection title="Create a template">
        <DocSteps
          steps={[
            {
              title: "Open Templates",
              body: (
                <DocParagraph>
                  Go to <b>Settings → Templates</b> and click <b>Create Template</b>.
                </DocParagraph>
              ),
            },
            {
              title: "Fill in the details",
              body: (
                <DocParagraph>
                  Give it a unique name (lowercase, underscores only, e.g. <b>welcome_offer</b>),
                  pick the category, choose a language code (e.g. <b>en_US</b>), and write the
                  body text. Use <b>{'{{1}}'}</b>, <b>{'{{2}}'}</b> etc. for variable placeholders.
                  Optionally add a header (text/image/video/document) and footer text.
                </DocParagraph>
              ),
            },
            {
              title: "Save as Draft",
              body: (
                <DocParagraph>
                  Click <b>Save</b>. The template starts as <b>Draft</b> and is immediately usable
                  inside HopeChat automations and broadcasts.
                </DocParagraph>
              ),
            },
            {
              title: "Submit to Meta",
              body: (
                <DocParagraph>
                  Click <b>Sync from Meta</b> periodically to pull approval status back from
                  WhatsApp. A template submitted to Meta moves through <b>Pending</b> →{" "}
                  <b>Approved</b> (green badge) or <b>Rejected</b> (red badge) with a reason.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="Approval status">
        <DocList
          items={[
            <span key="1">
              <b>Draft</b> — saved in HopeChat but not submitted to Meta. Usable for testing.
            </span>,
            <span key="2">
              <b>Pending</b> — submitted to Meta, awaiting review (usually minutes to hours).
            </span>,
            <span key="3">
              <b>Approved</b> — ready for broadcasts. Shown with a green badge.
            </span>,
            <span key="4">
              <b>Rejected</b> — Meta declined it. Edit the content and resubmit.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Variables">
        <DocParagraph>
          Variables let you personalise every message. In the body text, write <b>{'{{1}}'}</b> where
          you want a value injected. When sending a broadcast, you map each column (or tag) to a
          variable. In automations, you reference the variable name directly.
        </DocParagraph>
      </DocSection>

      <DocCallout type="tip">
        Keep your templates short and specific. Shorter templates have higher approval rates and
        better read rates with customers.
      </DocCallout>

      <DocNext
        href="/docs/contacts"
        title="Contacts"
        description="Import and organise your contacts with tags and custom fields."
      />
    </DocPage>
  );
}