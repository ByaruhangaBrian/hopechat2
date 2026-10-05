import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocCallout,
} from "@/components/docs/doc-content";

const faqs = [
  {
    q: "Can I use my existing WhatsApp phone number?",
    a: "Yes. Connect the same number you already use — no new SIM and no lost history. HopeChat runs alongside the WhatsApp Business app through Meta's official coexistence model.",
  },
  {
    q: "Messages aren't arriving in the inbox after connecting — what's wrong?",
    a: "Check three things: (1) the Webhook Callback URL in your Meta app exactly matches the one shown in Settings → WhatsApp Config, (2) you've subscribed to the \"messages\" webhook field, and (3) your access token has the whatsapp_business_messaging and whatsapp_business_management permissions. Test the connection from Settings → WhatsApp Config.",
  },
  {
    q: "The dashboard shows \"Stored token can't be decrypted\" — how do I fix it?",
    a: "This means the encryption key on the server changed since the token was saved (e.g. ENCRYPTION_KEY was rotated). Use the Reset Configuration button in Settings → WhatsApp Config, re-enter your credentials, and save. Your old token is permanently unrecoverable.",
  },
  {
    q: "A WhatsApp template was rejected by Meta — what should I do?",
    a: "Meta rejects templates that violate their commerce or content policy. Open Settings → Templates, read the rejection reason, edit the content, and save. The template status resets to Draft and you can resubmit. Common reasons: promotional content in a Utility template, missing business info, or placeholder issues.",
  },
  {
    q: "How do I add more team members?",
    a: "Go to Settings → Users and click Add User. Your plan limits the number of seats: Bronze = 1, Silver = 5, Gold = 15. To add more, upgrade your plan from Settings → Billing.",
  },
  {
    q: "Can I run a broadcast without message credits?",
    a: "No. Each recipient uses one message credit. Top up from Settings → Billing if your balance is insufficient. Credits are consumed only when a message is actually sent — failed sends don't cost credits.",
  },
  {
    q: "How does the AI know when to escalate to a human?",
    a: "The AI scores its confidence on every answer. When it can't find a relevant match in your knowledge base, it sends a polite fallback message to the customer and flags the conversation in your inbox with a \"Bot\" tag so an agent can pick it up.",
  },
  {
    q: "A student is stuck on a timed exam — can I let them retry?",
    a: "If they abandoned the exam before finishing (i.e. never reached the score summary), they can retry — only completed attempts are blocked. If they completed the exam and want to retake it, you'd need to allow it from your end by clearing the attempt record — contact support.",
  },
  {
    q: "How do I pause automations without deleting them?",
    a: "Currently you can toggle an automation's active state from the automation list. A paused automation stops firing new triggers but any in-progress flows complete normally.",
  },
  {
    q: "Where do I find the webhook URL and verify token?",
    a: "The Webhook Callback URL is shown in Settings → WhatsApp Config. The system-wide Verify Token is managed by your system admin — contact them to obtain it before pasting it into your Meta app.",
  },
  {
    q: "Can I customise the WhatsApp bot's tone of voice?",
    a: "Yes. Go to the AI page and edit the system prompt. You can instruct the AI to speak formally, casually, in a specific language, or in a local dialect. Changes take effect immediately.",
  },
  {
    q: "Can I install HopeChat on my phone?",
    a: "Yes — HopeChat is a Progressive Web App. On Android and desktop Chrome or Edge an install banner appears at the top of the dashboard after you sign in; tap \"Install App\" and confirm in the browser dialog. On iPhone or iPad, tap the Share button in Safari and choose \"Add to Home Screen\". The installed copy opens full-screen with no address bar and supports long-press shortcuts to your Inbox, Broadcasts, and Contacts. Dismiss the banner and we won't ask again for 30 days.",
  },
  {
    q: "The install banner never shows up — why?",
    a: "A few reasons. The banner is suppressed if the app is already installed, if you dismissed it in the last 30 days, or if you opened HopeChat in a private/incognito window (installations are disabled there). It's also Chromium-only — Safari, Firefox, and in-app browsers such as Chrome on iOS don't support the programmatic install prompt, so iOS users install through the Share sheet instead. Note that service workers only register on production builds, so you won't see an install prompt from a local dev server.",
  },
  {
    q: "My plan expired — what happens to my workspace?",
    a: "You get a 7-day grace period after expiry where features remain active. After grace, the workspace enters read-only mode: you can still view data but can't send messages or run automations until you renew.",
  },
];

export default function DocsFAQPage() {
  return (
    <DocPage
      title="FAQ & troubleshooting"
      subtitle="Answers to the most common questions about setting up and using HopeChat."
    >
      <DocSection title="Setup">
        <div className="space-y-3">
          {faqs.slice(0, 6).map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-border bg-background">
              <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-foreground hover:bg-muted/30 transition-colors">
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed font-medium border-t border-border pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </DocSection>

      <DocSection title="Features & billing">
        <div className="space-y-3">
          {faqs.slice(6).map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-border bg-background">
              <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-foreground hover:bg-muted/30 transition-colors">
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed font-medium border-t border-border pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </DocSection>

      <DocCallout type="note">
        Still stuck? Reach out at{" "}
        <a href="mailto:info@hopechat.net" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          info@hopechat.net
        </a>{" "}
        or call{" "}
        <a href="tel:+256763149276" className="font-bold text-primary hover:underline">
          +256 763 149 276
        </a>
        . Our team typically responds within a few hours during business hours (EAT).
      </DocCallout>
    </DocPage>
  );
}