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

export default function DocsWhatsappPage() {
  return (
    <DocPage
      title="Connect WhatsApp"
      subtitle="Connect your official WhatsApp Business number to HopeChat so customers can reach you and automations can reply instantly."
    >
      <DocSection title="What you need">
        <DocParagraph>
          HopeChat uses the official Meta WhatsApp Business API (Cloud API), which lives in your
          Meta business ecosystem. To connect it you need three values from Meta plus your webhook
          URL:
        </DocParagraph>
        <div className="grid gap-3 sm:grid-cols-2">
          <DocField label="Phone Number ID" value="A numeric ID for your WhatsApp number" />
          <DocField label="WhatsApp Business Account ID" value="A numeric ID for your business account" />
          <DocField label="Permanent Access Token" value="A long-lived system-user token" />
          <DocField label="Webhook Callback URL" value="Auto-shown in Settings → WhatsApp Config" />
        </div>
      </DocSection>

      <DocSection title="Step 1 — Have the Meta prerequisites ready">
        <DocParagraph>
          These one-time setup steps happen in Meta, not in HopeChat. If you already have a Meta
          business app with the WhatsApp product added, skip to step 2.
        </DocParagraph>
        <DocList
          items={[
            <span key="1">
              Go to <b>developers.facebook.com</b>, open <b>My Apps</b>, and click <b>Create App</b>. Choose{" "}
              <b>Business</b> as the app type.
            </span>,
            <span key="2">
              In your app dashboard, click <b>Add Product</b>, find <b>WhatsApp</b>, and click <b>Set Up</b>.
              Follow the wizard to connect your WhatsApp Business number.
            </span>,
            <span key="3">
              Under <b>WhatsApp → API Setup</b> you&apos;ll find your <b>Phone Number ID</b> and{" "}
              <b>WhatsApp Business Account ID</b>.
            </span>,
            <span key="4">
              Generate a <b>Permanent Access Token</b> from <b>Business Settings → System Users</b>.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Step 2 — Enter credentials in HopeChat">
        <DocSteps
          steps={[
            {
              title: "Open WhatsApp Config",
              body: (
                <DocParagraph>
                  From your dashboard go to <b>Settings → WhatsApp Config</b>. The screen shows your
                  connection status at the top — &quot;Not Connected&quot; until setup completes.
                </DocParagraph>
              ),
            },
            {
              title: "Paste your API credentials",
              body: (
                <DocParagraph>
                  In the <b>API Credentials</b> card, enter your <b>Phone Number ID</b>,{" "}
                  <b>WhatsApp Business Account ID</b>, and <b>Permanent Access Token</b>. The token is
                  encrypted at rest — it&apos;s never stored in plain text.
                </DocParagraph>
              ),
            },
            {
              title: "Save configuration",
              body: (
                <DocParagraph>
                  Click <b>Save Configuration</b>. HopeChat verifies the credentials by pinging Meta and,
                  on success, confirms which verified business the number belongs to
                  (e.g. &quot;Connected to Acme Corp&quot;).
                </DocParagraph>
              ),
            },
            {
              title: "Configure the webhook",
              body: (
                <DocParagraph>
                  Copy the <b>Webhook Callback URL</b> shown on this screen — it follows the form{" "}
                  <b>https://your-domain/api/whatsapp/webhook</b>. In your Meta app, under{" "}
                  <b>WhatsApp → Configuration → Webhook</b>, click <b>Edit</b>, paste the URL, enter
                  the <b>Verify Token</b> provided by your system admin, and subscribe to the{" "}
                  <b>messages</b> webhook field. If you had to change anything, click <b>Verify and Save</b>.
                </DocParagraph>
              ),
            },
            {
              title: "Test the connection",
              body: (
                <DocParagraph>
                  Back in HopeChat, click <b>Test API Connection</b>. The status card should flip to{" "}
                  <b>Connected</b>, and your number can now send and receive messages.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="Using your existing number">
        <DocParagraph>
          You can connect the same WhatsApp number you already use for your business — there&apos;s no
          new SIM and no lost history. HopeChat runs alongside the WhatsApp Business app on your phone
          through Meta&apos;s official coexistence model.
        </DocParagraph>
      </DocSection>

      <DocSection title="Troubleshooting">
        <DocList
          items={[
            <span key="1">
              <b>Stored token can&apos;t be decrypted</b> — an amber banner appears when the saved token
              can&apos;t be read back. Use <b>Reset Configuration</b> and re-enter your credentials.
            </span>,
            <span key="2">
              <b>&quot;Not Connected&quot; after saving</b> — the token may be invalid, expired, or lack the{" "}
              <b>whatsapp_business_messaging</b> and <b>whatsapp_business_management</b> permissions.
              Regenerate it in Meta. Fixes here: <a href="/docs/faq" className="font-bold text-primary hover:underline">FAQ</a>.
            </span>,
            <span key="3">
              <b>Messages not arriving</b> — verify the webhook is set to the exact callback URL shown and
              subscribed to <b>messages</b>.
            </span>,
          ]}
        />
      </DocSection>

      <DocCallout type="warning">
        Keep your Permanent Access Token secret. HopeChat shields it after save — if you ever need to
        update your configuration, re-enter the token rather than relying on a masked value.
      </DocCallout>

      <DocNext
        href="/docs/team"
        title="Team & permissions"
        description="Invite your team and set what each role can do in the inbox."
      />
    </DocPage>
  );
}