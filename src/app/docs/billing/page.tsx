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

export default function DocsBillingPage() {
  return (
    <DocPage
      title="Billing & credits"
      subtitle="Understand plans, top up credits, and pay securely via Mobile Money or credit card through Pesapal."
    >
      <DocSection title="Plans overview">
        <DocParagraph>
          HopeChat runs on simple monthly plans with increasing limits on seats, features,
          and included credits. Pick the one that fits your team today — you can upgrade or
          downgrade at any time from <b>Settings → Billing</b>.
        </DocParagraph>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocField label="Bronze" value="65,000 UGX/mo · 1 seat · core features" />
          <DocField label="Silver" value="180,000 UGX/mo · 5 seats · broadcasts" />
          <DocField label="Gold" value="450,000 UGX/mo · 15 seats · all features" />
        </div>
        <DocCallout type="tip">
          Pay for 3, 6, or 12 months upfront and save up to 10%. Discounts are calculated
          automatically when you select your period at checkout.
        </DocCallout>
      </DocSection>

      <DocSection title="What are credits?">
        <DocParagraph>
          Credits are consumed each time HopeChat performs a billable action. Your plan includes
          a base number of credits each month. When they run out, you can top up from the Billing
          page without changing your plan.
        </DocParagraph>
        <DocList
          items={[
            <span key="1">
              <b>AI chat response</b> — 1 credit per response.
            </span>,
            <span key="2">
              <b>Interactive form / test</b> — 1 credit per completed test attempt.
            </span>,
            <span key="3">
              <b>Bulk broadcast</b> — 1 credit per recipient (WhatsApp).
            </span>,
            <span key="4">
              <b>SMS broadcast</b> — 1 credit per SMS sent.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Top up credits">
        <DocSteps
          steps={[
            {
              title: "Open Billing",
              body: (
                <DocParagraph>
                  Go to <b>Settings → Billing</b>. You&apos;ll see your current plan, balance, and
                  the top-up form.
                </DocParagraph>
              ),
            },
            {
              title: "Enter an amount",
              body: (
                <DocParagraph>
                  Type the amount in UGX you want to pay. The form shows how many credits that
                  buys. Choose <b>Mobile Money</b> or <b>Card</b> as your payment method.
                </DocParagraph>
              ),
            },
            {
              title: "Pay via Pesapal",
              body: (
                <DocParagraph>
                  Click <b>Pay</b> to be redirected to Pesapal. Complete the payment on your phone
                  or card. On success you&apos;re returned to HopeChat and the credits are added
                  immediately — no refresh needed.
                </DocParagraph>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection title="Purchase a subscription plan">
        <DocList
          items={[
            <span key="1">
              Click <b>View Plans</b> in the Billing card to browse Bronze, Silver, and Gold.
            </span>,
            <span key="2">
              Select the plan and billing period (1, 3, 6, or 12 months).
            </span>,
            <span key="3">
              Pay via Pesapal. Your plan activates on success and your feature limits update
              immediately.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="View your usage">
        <DocParagraph>
          The <b>Credit Usage</b> tab in Billing shows a log of every credit consumed: who
          (contact), what action, how many credits, and when. Filter by month to audit usage
          and find high-consumption contacts.
        </DocParagraph>
      </DocSection>

      <DocCallout type="note">
        Subscriptions include a 7-day grace period after expiry. During grace, your features
        stay active. After grace expires, the workspace enters read-only mode until you renew.
      </DocCallout>

      <DocNext
        href="/docs/faq"
        title="FAQ & troubleshooting"
        description="Answers to the most common setup and usage questions."
      />
    </DocPage>
  );
}