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

export default function DocsBroadcastsPage() {
  return (
    <DocPage
      title="Broadcasts"
      subtitle="Send bulk WhatsApp and SMS campaigns to your contacts — schedule, personalise, and track delivery and read status."
    >
      <DocSection title="What you need before broadcasting">
        <DocList
          items={[
            <span key="1">
              At least one <b>Approved</b> WhatsApp message template (see{" "}
              <a href="/docs/templates" className="font-bold text-primary hover:underline">
                Message templates
              </a>
              ).
            </span>,
            <span key="2">
              Contacts imported and organised (see{" "}
              <a href="/docs/contacts" className="font-bold text-primary hover:underline">
                Contacts
              </a>
              ).
            </span>,
            <span key="3">
              Enough message credits for the audience size (check your balance in{" "}
              <b>Settings → Billing</b>).
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Send a broadcast">
        <DocSteps
          steps={[
            {
              title: "Choose a channel",
              body: (
                <DocParagraph>
                  Go to <b>Broadcasts → New Broadcast</b>. Pick <b>WhatsApp</b> or <b>SMS</b> as
                  the delivery channel.
                </DocParagraph>
              ),
            },
            {
              title: "Select a template",
              body: (
                <DocParagraph>
                  Choose from your approved templates. The body with variables is shown so you
                  can confirm the content before sending.
                </DocParagraph>
              ),
            },
            {
              title: "Select your audience",
              body: (
                <DocParagraph>
                  Filter by tags, custom fields, or send to all contacts. The audience count
                  and total credit cost are shown before you proceed.
                </DocParagraph>
              ),
            },
            {
              title: "Personalise and schedule",
              body: (
                <DocParagraph>
                  Map template variables to contact fields (e.g. <b>{'{{1}}'}</b> → name). Preview
                  a sample message, then send immediately or schedule for a future date and time.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="Track results">
        <DocParagraph>
          Open the broadcast from the broadcasts list to see per-recipient delivery and read
          status. Failed sends are flagged with a reason (invalid number, opt-out, template
          rejected). A summary shows total sent, delivered, read, and failed.
        </DocParagraph>
      </DocSection>

      <DocSection title="SMS channel">
        <DocParagraph>
          SMS broadcasts work identically but use a text-only template with no variable
          substitution limit. They reach contacts who aren&apos;t on WhatsApp. SMS uses the same
          credit system and is dispatched through the integrated SMS provider.
        </DocParagraph>
      </DocSection>

      <DocCallout type="note">
        Each recipient in a WhatsApp broadcast uses one message credit. A broadcast to 500 contacts
        costs 500 credits. Check your balance before scheduling.
      </DocCallout>

      <DocNext
        href="/docs/billing"
        title="Billing & credits"
        description="Plans, payments, and how credits are used."
      />
    </DocPage>
  );
}