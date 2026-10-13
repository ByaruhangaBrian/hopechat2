import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocSteps,
  DocCallout,
  DocNext,
} from "@/components/docs/doc-content";

export default function DocsAIPage() {
  return (
    <DocPage
      title="AI assistant"
      subtitle="Train the AI on your business documents — product catalogues, FAQs, price lists, and websites — so it answers customer questions instantly and accurately."
    >
      <DocSection title="How the AI works">
        <DocParagraph>
          HopeChat AI learns from the documents you upload: PDFs, text files, images, and
          website URLs. When a customer messages you, the AI searches your knowledge base for the
          best answer and replies automatically. If it&apos;s not confident or the question is outside
          your knowledge, it escalates to a human agent so the conversation never goes cold.
        </DocParagraph>
      </DocSection>

      <DocSection title="Set up the AI">
        <DocSteps
          steps={[
            {
              title: "Open the AI page",
              body: (
                <DocParagraph>
                  Go to <b>AI</b> in the sidebar. The page shows your current knowledge base and
                  configuration.
                </DocParagraph>
              ),
            },
            {
              title: "Upload documents",
              body: (
                <DocParagraph>
                  Click <b>Upload</b> and add your business files — price lists, FAQs, product
                  descriptions, policy documents. Each file is indexed and searchable by the AI.
                </DocParagraph>
              ),
            },
            {
              title: "Add website URLs",
              body: (
                <DocParagraph>
                  Paste any public website URL you want the AI to learn from. HopeChat crawls the
                  page content and adds it to the knowledge base automatically.
                </DocParagraph>
              ),
            },
            {
              title: "Configure behaviour",
              body: (
                <DocParagraph>
                  In the AI Config section you can set the system prompt (how the AI behaves),
                  decide whether it escalates unknown questions, and review the training data
                  to remove outdated or incorrect entries.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="When the AI replies">
        <DocList
          items={[
            <span key="1">
              <b>Confident answer</b> — the AI sends a reply based on your documents, with a
              brief source attribution.
            </span>,
            <span key="2">
              <b>Escalation</b> — when the AI can&apos;t find a good answer, or the customer
              uses one of your trigger words, it lets the customer know a human will follow up
              and flags the conversation in your inbox.
            </span>,
            <span key="3">
              <b>Human handoff</b> — the conversation appears in your shared inbox wearing the
              reserved escalation tag (default &quot;Needs human&quot;) so agents spot it at a
              glance. If auto-pause is on, the AI goes quiet until someone takes over.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Escalation to a human">
        <DocParagraph>
          In the AI Hub under <b>Configuration → Escalation to a human</b> you decide when the AI
          hands a conversation to your team.
        </DocParagraph>
        <DocList
          items={[
            <span key="1">
              <b>Trigger keywords</b> — any message that contains one of your words (matched whole,
              ignoring case) escalates the chat. The defaults cover things like &quot;human&quot;,
              &quot;agent&quot;, &quot;refund&quot;, and &quot;complaint&quot;.
            </span>,
            <span key="2">
              <b>Auto-pause the AI</b> — when on, the assistant stops replying as soon as a chat is
              escalated, so it never talks over your agent.
            </span>,
            <span key="3">
              <b>Contact tag</b> — escalated contacts are labelled with a reserved system tag
              (default &quot;Needs human&quot;) that your team can filter on but can&apos;t delete.
            </span>,
            <span key="4">
              <b>Needs attention filter</b> — use it in the inbox to jump straight to every
              conversation waiting for a person.
            </span>,
          ]}
        />
        <DocParagraph>
          From the conversation itself an agent can <b>Take over</b> (pause the AI and reply
          manually), <b>Return to AI</b> (resume automated replies), or <b>Resolve</b> the
          escalation once the customer is helped.
        </DocParagraph>
      </DocSection>

      <DocSection title="Control when the AI replies">
        <DocParagraph>
          By default the AI replies at all hours. In the AI Hub under{" "}
          <b>Configuration → AI availability</b> you can switch on &quot;Only reply during set
          hours&quot;, pick your time zone, and set a start and end time for each day. Days you
          turn off are treated as closed.
        </DocParagraph>
        <DocList
          items={[
            <span key="1">
              <b>Inside the window</b> the AI answers incoming messages exactly as usual.
            </span>,
            <span key="2">
              <b>Outside the window</b> the AI stays silent and leaves the conversation for your
              team — no auto-reply is sent and no credit is used.
            </span>,
            <span key="3">
              Overnight windows (for example 22:00 to 06:00) are supported and wrap past midnight.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Best practices">
        <DocList
          items={[
            <span key="1">
              Keep documents current — update your knowledge base when prices, policies, or
              products change.
            </span>,
            <span key="2">
              Start with your FAQ — the questions customers already ask are the highest-value
              content for the AI.
            </span>,
            <span key="3">
              Review escalated conversations — they often reveal gaps in your knowledge base
              that you can fix by adding a new document.
            </span>,
          ]}
        />
      </DocSection>

      <DocCallout type="tip">
        Each AI response uses one message credit. You can monitor usage from Settings → Billing →
        Credit Usage.
      </DocCallout>

      <DocNext
        href="/docs/tests"
        title="Tests & Practice"
        description="Run practice drills and timed exams on WhatsApp — automatically graded."
      />
    </DocPage>
  );
}