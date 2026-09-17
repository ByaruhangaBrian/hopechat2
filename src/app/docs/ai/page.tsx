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
              <b>Escalation</b> — when the AI can&apos;t find a good answer, it lets the customer
              know a human will follow up, and notifies your team in the inbox.
            </span>,
            <span key="3">
              <b>Human handoff</b> — the conversation appears in your shared inbox with a
              &quot;Bot&quot; tag so agents know it was triaged.
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