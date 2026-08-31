import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminAlert } from "@/lib/admin-alerts";

/** Where demo / setup-service requests are delivered. */
export const DEMO_REQUEST_RECIPIENT = "hopetechsolutionsltd@gmail.com";

export interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
}

export function isEmailConfigured(settings: EmailSettings): boolean {
  return Boolean(settings.host && settings.user && settings.password && settings.from_email);
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const db = createAdminClient();
  const { data } = await db
    .from("system_settings")
    .select("value")
    .eq("id", "email_settings")
    .maybeSingle();

  const v = data?.value;

  return {
    host: v?.host || process.env.SMTP_HOST || "",
    port: v?.port ?? Number(process.env.SMTP_PORT ?? 587),
    secure: v?.secure ?? process.env.SMTP_SECURE === "true",
    user: v?.user || process.env.SMTP_USER || "",
    password: v?.password || process.env.SMTP_PASSWORD || "",
    from_name: v?.from_name || "HopeChat",
    from_email: v?.from_email || process.env.SMTP_FROM || "",
  };
}

function buildTransporter(settings: EmailSettings): Transporter {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user
      ? { user: settings.user, pass: settings.password }
      : undefined,
  });
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Business the email relates to, for admin-alert attribution. */
  businessId?: string | null;
}

/**
 * Send an email through the configured SMTP server. Never throws — failures
 * are logged and reported so callers (payment callbacks, lazy reminders)
 * can continue without breaking their primary flow.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const settings = await getEmailSettings();

  if (!isEmailConfigured(settings)) {
    console.warn("[email] SMTP not configured — skipping email to", input.to, input.subject);
    await logEmailAlert(input, false, "SMTP not configured", "critical");
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = buildTransporter(settings);
    await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    await logEmailAlert(input, true);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send email:", message);
    await logEmailAlert(input, false, message, "critical");
    return { ok: false, error: message };
  }
}

/** Record every email send attempt in the admin alerts section. */
async function logEmailAlert(
  input: SendEmailInput,
  ok: boolean,
  error?: string,
  severity: "info" | "warning" | "critical" = "info",
): Promise<void> {
  await createAdminAlert({
    alertType: "custom",
    businessId: input.businessId,
    severity,
    title: ok ? `Email sent — ${input.subject}` : `Email failed — ${input.subject}`,
    message: ok
      ? `Notification email sent to ${input.to}.`
      : `Notification email to ${input.to} failed${error ? `: ${error}` : "."}`,
    metadata: {
      type: "email_notification",
      to: input.to,
      subject: input.subject,
      ok,
      error: error ?? null,
    },
  });
}

function layout(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#6d28d9;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">HopeChat</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">${subject}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
                You are receiving this email because you have an account on HopeChat.
                If you did not expect this email, you can ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function price(ugx: number): string {
  return `UGX ${ugx.toLocaleString()}`;
}

export async function sendSubscriptionReceipt(input: {
  to: string;
  businessName: string;
  tierName: string;
  months: number;
  amountUgx: number;
  expiresOn: string;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, tierName, months, amountUgx, expiresOn, businessId } = input;
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(businessName)}</strong>,<br/>
      Your <strong>${escapeHtml(tierName)}</strong> subscription has been activated.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Plan</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(tierName)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Period</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${months} month${months > 1 ? "s" : ""}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Amount</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${price(amountUgx)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Valid until</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(expiresOn)}</td></tr>
    </table>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Thank you for subscribing with HopeChat.</p>
  `;
  return sendEmail({ to, subject: `Your ${tierName} subscription is active`, text: `Your ${tierName} subscription has been activated (${months} month(s), ${price(amountUgx)}). Valid until ${expiresOn}.`, html: layout(`Subscription activated`, body), businessId });
}

export async function sendCreditReceipt(input: {
  to: string;
  businessName: string;
  amountUgx: number;
  creditsAdded: number;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, amountUgx, creditsAdded, businessId } = input;
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(businessName)}</strong>,<br/>
      Your credit purchase has been received.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Amount</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${price(amountUgx)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Credits added</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${creditsAdded.toLocaleString()}</td></tr>
    </table>
  `;
  return sendEmail({ to, subject: "Credits added to your account", text: `${creditsAdded.toLocaleString()} credits (${price(amountUgx)}) were added to your account.`, html: layout("Credits added", body), businessId });
}

export async function sendExpiryWarning(input: {
  to: string;
  businessName: string;
  tierName: string;
  expiresOn: string;
  graceEndsOn: string;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, tierName, expiresOn, graceEndsOn, businessId } = input;
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(businessName)}</strong>,<br/>
      Your <strong>${escapeHtml(tierName)}</strong> subscription is expiring.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Expires on</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(expiresOn)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Grace ends</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(graceEndsOn)}</td></tr>
    </table>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Renew in the Billing section of your dashboard to keep your service active. After the grace period, your account will be suspended until you renew.</p>
  `;
  return sendEmail({ to, subject: "Your subscription is expiring", text: `Your ${tierName} subscription expires on ${expiresOn} (grace until ${graceEndsOn}). Please renew to avoid suspension.`, html: layout("Subscription expiring", body), businessId });
}

export async function sendDemoRequestNotification(input: {
  name: string;
  businessName: string;
  companySize: string;
  phone: string;
  email: string;
  services: string[];
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { name, businessName, companySize, phone, email, services, message } = input;
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      A new demo / setup-service request was submitted on the HopeChat website.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Name</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Business</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(businessName)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Company size</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(companySize)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Phone / WhatsApp</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(phone)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Email</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Services</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${services.length ? services.map(escapeHtml).join(", ") : "—"}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#71717a;">Message</td><td style="padding:10px 16px;font-size:13px;color:#18181b;font-weight:bold;">${escapeHtml(message) || "—"}</td></tr>
    </table>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Reply directly to ${escapeHtml(email)} or call/WhatsApp ${escapeHtml(phone)}.</p>
  `;
  return sendEmail({
    to: DEMO_REQUEST_RECIPIENT,
    subject: `New demo / setup request — ${escapeHtml(businessName)}`,
    text: `Demo / setup request: ${name} (${businessName}, ${companySize}). Phone: ${phone}. Email: ${email}. Services: ${services.join(", ") || "—"}. Message: ${message || "—"}`,
    html: layout("New demo / setup request", body),
  });
}

export async function sendDemoRequestConfirmation(input: {
  to: string;
  name: string;
  businessName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, name, businessName } = input;
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(name)}</strong>,<br/>
      Thanks for requesting a demo of HopeChat for <strong>${escapeHtml(businessName)}</strong>.
    </p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Our team will reach out within 1 business day to schedule your demo and, if you're interested, walk you through our concierge setup service.
    </p>
    <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">
      Need us sooner? Call or WhatsApp us on <strong>+256 763 149 276</strong> or email <strong>hopetechsolutionsltd@gmail.com</strong>.
    </p>
  `;
  return sendEmail({
    to,
    subject: "We received your HopeChat demo request",
    text: `Hi ${name}, thanks for requesting a demo of HopeChat for ${businessName}. Our team will reach out within 1 business day. Need us sooner? Call/WhatsApp +256 763 149 276 or email hopetechsolutionsltd@gmail.com.`,
    html: layout("Demo request received", body),
  });
}

function recoverySignupLink(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/signup`;
}

function recoveryLoginLink(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`;
}

/**
 * Recovery email #1 — the visitor typed their email on the signup form
 * but never created an account.
 */
export async function sendSignupReminder(input: {
  to: string;
  fullName?: string | null;
  businessName?: string | null;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, fullName, businessName, businessId } = input;
  const name = fullName?.trim() || businessName?.trim() || "there";
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(name)}</strong>,<br/>
      You started creating a HopeChat account but didn't finish. We noticed your email was on our signup page.
    </p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Picking up where you left off takes less than a minute — connect WhatsApp, train your AI assistant, and start automating replies.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${recoverySignupLink()}" style="background-color:#6d28d9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Complete your signup</a>
    </p>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Questions? Reply to this email and our team will help you get set up.</p>
  `;
  return sendEmail({
    to,
    subject: "Finish creating your HopeChat account",
    text: `Hi ${name}, you started creating a HopeChat account but didn't finish. Complete your signup here: ${recoverySignupLink()}`,
    html: layout("Finish your signup", body),
    businessId,
  });
}

/**
 * Recovery email #2 — the user created an account but never finished
 * the onboarding step (business name / entering the dashboard).
 */
export async function sendSetupReminder(input: {
  to: string;
  fullName?: string | null;
  businessName?: string | null;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, fullName, businessName, businessId } = input;
  const name = fullName?.trim() || businessName?.trim() || "there";
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(name)}</strong>,<br/>
      Your HopeChat account is ready, but your workspace setup isn't finished yet — so we can't fire up your automations just yet.
    </p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Follow these three quick steps to go live:
    </p>
    <ol style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>Sign in and name your workspace</li>
      <li>Connect your WhatsApp number</li>
      <li>Let the AI assistant greet &amp; answer your customers</li>
    </ol>
    <p style="margin:0 0 24px;">
      <a href="${recoveryLoginLink()}" style="background-color:#6d28d9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Finish setup</a>
    </p>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Need a hand? We offer a concierge setup service — just reply to this email.</p>
  `;
  return sendEmail({
    to,
    subject: "Finish setting up your HopeChat workspace",
    text: `Hi ${name}, your HopeChat account is ready but your workspace setup isn't finished. Sign in and continue here: ${recoveryLoginLink()}`,
    html: layout("Finish your setup", body),
    businessId,
  });
}

/**
 * Recovery email #3 — the user finished onboarding but hasn't engaged
 * with the product yet (no WhatsApp, no automations, no messages).
 */
export async function sendEngagementReminder(input: {
  to: string;
  fullName?: string | null;
  businessName?: string | null;
  businessId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, fullName, businessName, businessId } = input;
  const name = fullName?.trim() || businessName?.trim() || "there";
  const body = `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi <strong>${escapeHtml(name)}</strong>,<br/>
      Your HopeChat workspace is all set up — but we haven't seen any activity yet, and we'd love to help you get real value from it.
    </p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Here's what our most successful businesses do first:
    </p>
    <ul style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>Connect WhatsApp and turn on the AI welcome message</li>
      <li>Create one automation (e.g. auto-reply to common questions)</li>
      <li>Import your contacts and send your first broadcast</li>
    </ul>
    <p style="margin:0 0 24px;">
      <a href="${recoveryLoginLink()}" style="background-color:#6d28d9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Open your dashboard</a>
    </p>
    <p style="margin:0;color:#3f3f46;font-size:14px;">Want us to set it all up for you? Reply to this email to book a free setup session.</p>
  `;
  return sendEmail({
    to,
    subject: "Make HopeChat work for you",
    text: `Hi ${name}, your HopeChat workspace is set up but we haven't seen any activity. Log in to connect WhatsApp, create an automation, or send a broadcast: ${recoveryLoginLink()}`,
    html: layout("Get the most from HopeChat", body),
    businessId,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
