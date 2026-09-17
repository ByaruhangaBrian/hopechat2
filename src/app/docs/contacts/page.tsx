import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocSteps,
  DocCallout,
  DocNext,
} from "@/components/docs/doc-content";

export default function DocsContactsPage() {
  return (
    <DocPage
      title="Contacts"
      subtitle="Import, organise, and segment your contacts so automations and broadcasts reach the right people."
    >
      <DocSection title="Add contacts">
        <DocList
          items={[
            <span key="1">
              <b>CSV import</b> — the fastest way to bulk-add. Export a spreadsheet (Google Sheets,
              Excel) and upload it from the Contacts page. Match columns to phone, name, email, and
              custom fields.
            </span>,
            <span key="2">
              <b>From conversations</b> — anyone who messages your WhatsApp number is automatically
              added as a contact.
            </span>,
            <span key="3">
              <b>Manual</b> — click <b>+ Add Contact</b> to create one at a time.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Organise with tags">
        <DocParagraph>
          Tags let you group contacts in flexible, overlapping ways — e.g. <b>lead</b>,{" "}
          <b>vip</b>, <b>student_class_5</b>. Apply tags in bulk from the contact list, or let
          automations tag contacts automatically when certain conditions are met.
        </DocParagraph>
        <DocCallout type="note">
          Create and manage tags from <b>Settings → Tags</b>. Tag names are freeform strings —
          use whatever vocabulary your team already uses.
        </DocCallout>
      </DocSection>

      <DocSection title="Custom fields">
        <DocParagraph>
          Beyond the standard fields (name, phone, email, notes), you can add any number of
          custom fields — e.g. <b>Grade</b>, <b>Course</b>, <b>Purchase date</b>. Custom fields
          can be referenced in automations for conditional routing and used in template variable
          substitution.
        </DocParagraph>
      </DocSection>

      <DocSection title="Dedupe">
        <DocParagraph>
          HopeChat identifies contacts by phone number. If you import a CSV with duplicate
          numbers, only the latest row is kept and existing data is updated — no duplicate
          conversations are created.
        </DocParagraph>
      </DocSection>

      <DocSection title="Use contacts in automations">
        <DocParagraph>
          Tags and custom fields are the primary filters in automations. For example, an
          automation trigger can watch for a keyword like &quot;pricing&quot; and only send
          a reply when the contact has the <b>lead</b> tag. Routing rules in entry tests
          also use intro-answer values (which become temporary contact attributes) to decide
          which test to send next.
        </DocParagraph>
      </DocSection>

      <DocCallout type="tip">
        Import your contact list before building automations — automations use contact
        attributes (tags, custom fields, answers) to decide who gets what.
      </DocCallout>

      <DocNext
        href="/docs/automations"
        title="Automations"
        description="Set up no-code workflows that reply to customers instantly."
      />
    </DocPage>
  );
}