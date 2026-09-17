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

export default function DocsTestsPage() {
  return (
    <DocPage
      title="Tests & Practice"
      subtitle="Create practice drills and timed exams that run automatically on WhatsApp — questions delivered one at a time, answers graded, scores reported."
    >
      <DocSection title="What's the difference?">
        <div className="grid gap-3 sm:grid-cols-2">
          <DocField
            label="Practice drill"
            value="No time limit. The correct answer is revealed after each question. The student can restart at the end."
          />
          <DocField
            label="Timed exam"
            value="A fixed duration enforced server-side. Results are hidden until the end. Each phone number can attempt it only once."
          />
        </div>
      </DocSection>

      <DocSection title="Create a test">
        <DocSteps
          steps={[
            {
              title: "Open Tests & Practice",
              body: (
                <DocParagraph>
                  Go to <b>Tests &amp; Practice</b> (under Automations in the sidebar). You&apos;ll
                  see your list of tests (empty on first use).
                </DocParagraph>
              ),
            },
            {
              title: "Create a new test",
              body: (
                <DocParagraph>
                  Click <b>+ New Test</b>. Give it a title, choose the mode: <b>Practice</b> or{" "}
                  <b>Timed Test</b>. For timed tests, set a <b>Duration (minutes)</b> and a{" "}
                  <b>Pass mark</b> (%). The <b>Active</b> toggle controls whether the test can be
                  dispatched — turn it on when you&apos;re ready.
                </DocParagraph>
              ),
            },
            {
              title: "Configure intro questions",
              body: (
                <DocParagraph>
                  Intro questions collect student profile data (e.g. class, subject) before the
                  real quiz. Add one by clicking the intro section — each has a label, a type
                  (choice or text), and options if choice.
                </DocParagraph>
              ),
            },
            {
              title: "Add questions",
              body: (
                <DocParagraph>
                  In the questions panel, add multiple-choice questions with up to 5 options
                  (A–E). Mark the correct answer and assign points. You can drag to reorder. For
                  bulk imports, download the CSV template, fill in your questions, and upload —
                  all rows are imported in one go.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="How students experience it">
        <DocList
          items={[
            <span key="1">
              An automation step (or a message) triggers the test — the first intro question is
              sent as a WhatsApp button.
            </span>,
            <span key="2">
              The student taps an option; the next question is sent immediately.
            </span>,
            <span key="3">
              After the last question, the score summary appears with time used (timed tests) and
              pass/fail status.
            </span>,
            <span key="4">
              Practice tests show a &quot;Start over&quot; option. Timed tests do not — they are
              once per phone number.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Entry tests and routing">
        <DocParagraph>
          An <b>entry test</b> asks profile questions (e.g. class, subject) and then routes the
          student to the right test automatically. Each regular test declares{" "}
          <b>routing rules</b> (e.g. grade=5 AND subject=math). If the rules match the student&apos;s
          intro answers, they&apos;re routed straight into that test. The entry test&apos;s questions
          carry through so the student never has to re-enter their profile.
        </DocParagraph>
      </DocSection>

      <DocSection title="AI-offered tests">
        <DocParagraph>
          With the <b>Tests &amp; Practice</b> switch &quot;AI can offer your tests&quot; enabled
          (on by default), your AI assistant recognizes when a student wants to take a{" "}
          <b>test / quiz / exam / assessment</b> and responds with a confirmation question. It
          never starts anything without the student&apos;s agreement.
        </DocParagraph>
        <DocSteps
          steps={[
            {
              title: "The student asks for a test",
              body: (
                <DocParagraph>
                  E.g. &quot;can I take the math quiz?&quot; — the AI picks the matching test from
                  your active list (or asks which one if several could fit).
                </DocParagraph>
              ),
            },
            {
              title: "Confirmation with buttons",
              body: (
                <DocParagraph>
                  The AI sends the offer with <b>Start</b> / <b>Not Now</b> WhatsApp buttons.
                  Nothing has started yet.
                </DocParagraph>
              ),
            },
            {
              title: "Start or Not Now",
              body: (
                <DocParagraph>
                  Tapping <b>Start</b> begins the normal test flow (intro questions, then graded
                  questions). Tapping <b>Not Now</b> closes the offer and the AI keeps chatting.
                  A typed &quot;yes&quot; / &quot;no&quot; also works.
                </DocParagraph>
              ),
            },
          ]}
        />
        <DocCallout type="note">
          Turning the switch off keeps tests fully AI-independent — keyword automations,
          entry-test screening, and routing flows all keep working exactly as before. The
          confirmation reply costs one AI credit and the finished attempt one test credit,
          unchanged from the rest of the platform.
        </DocCallout>
      </DocSection>

      <DocSection title="Credit cost">
        <DocParagraph>
          Every completed test attempt consumes one message credit, whether the student passes or
          fails. Abandoned attempts (the student stops replying) do not use a credit.
        </DocParagraph>
      </DocSection>

      <DocCallout type="warning">
        Timed exams can be attempted only once per phone number. If a student abandons the exam
        before finishing, they can retry — only completed attempts are blocked.
      </DocCallout>

      <DocNext
        href="/docs/broadcasts"
        title="Broadcasts"
        description="Send bulk WhatsApp and SMS campaigns to your contacts."
      />
    </DocPage>
  );
}