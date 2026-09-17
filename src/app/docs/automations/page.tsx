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

export default function DocsAutomationsPage() {
  return (
    <DocPage
      title="Automations"
      subtitle="Build no-code workflows that reply to customers, route conversations, tag contacts, and run on a schedule — all without writing code."
    >
      <DocSection title="How automations work">
        <DocParagraph>
          An automation is a sequence of <b>triggers</b>, <b>conditions</b>, and{" "}
          <b>steps</b>. When a trigger fires (a new message, a new contact, a keyword match, or a
          schedule), HopeChat walks through the steps — sending a text, asking a question, running a
          test, waiting, calling a webhook, or branching on a condition.
        </DocParagraph>
      </DocSection>

      <DocSection title="Create an automation">
        <DocSteps
          steps={[
            {
              title: "Open Automations",
              body: (
                <DocParagraph>
                  Go to <b>Automations</b> in the sidebar and click <b>+ New Automation</b>.
                </DocParagraph>
              ),
            },
            {
              title: "Set a trigger",
              body: (
                <DocParagraph>
                  Choose when the automation starts: <b>Message received</b> (all or keyword),
                  <b>New contact</b>, or <b>Schedule</b>. Keyword triggers watch for exact text the
                  customer sends.
                </DocParagraph>
              ),
            },
            {
              title: "Add steps",
              body: (
                <DocParagraph>
                  Drag in steps from the step panel. Each step is one action: send a text, send a
                  template, ask a question, run a test, add a tag, wait, call a webhook, or branch
                  on a condition. You can chain them in sequence or split into branches.
                </DocParagraph>
              ),
            },
            {
              title: "Save and test",
              body: (
                <DocParagraph>
                  Click <b>Save</b>. Send a test message matching your trigger from any phone to see
                  it fire. The automation tab shows a live log of every run.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="Available step types">
        <div className="grid gap-3 sm:grid-cols-2">
          <DocField label="Send text" value="Send a plain-text WhatsApp message" />
          <DocField label="Send template" value="Send an approved Meta message template" />
          <DocField label="Ask question" value="Ask a question and wait for the contact's reply" />
          <DocField label="Start test / practice" value="Dispatch a practice drill or timed exam" />
          <DocField label="Add tag" value="Tag the contact for segmentation" />
          <DocField label="Webhook" value="Call an external URL with the contact's data" />
          <DocField label="Wait" value="Pause the flow for a set time (needs cron enabled)" />
          <DocField label="Branch" value="Split into paths based on a condition" />
        </div>
      </DocSection>

      <DocSection title="Best practices">
        <DocList
          items={[
            <span key="1">
              <b>Start simple</b> — a one-step &quot;reply with info&quot; automation is the fastest way
              to prove the system works before adding branches.
            </span>,
            <span key="2">
              <b>Use keywords</b> — keyword triggers (e.g. &quot;help&quot;, &quot;price&quot;) let
              customers opt in to specific automations.
            </span>,
            <span key="3">
              <b>Tag contacts</b> — add a &quot;contacted&quot; or &quot;lead&quot; tag as a step
              so your team can segment later.
            </span>,
            <span key="4">
              <b>Check logs</b> — the automation detail page shows the run log with timestamps,
              helping you spot stuck or failing steps.
            </span>,
          ]}
        />
      </DocSection>

      <DocCallout type="note">
        Wait steps use the automation cron. If you haven&apos;t enabled it yet, ask your system
        admin or check the setup docs.
      </DocCallout>

      <DocNext
        href="/docs/ai"
        title="AI assistant"
        description="Train the AI on your business documents so it can answer customer questions."
      />
    </DocPage>
  );
}