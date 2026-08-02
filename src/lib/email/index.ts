import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

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
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send email:", message);
    return { ok: false, error: message };
  }
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
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, tierName, months, amountUgx, expiresOn } = input;
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
  return sendEmail({ to, subject: `Your ${tierName} subscription is active`, text: `Your ${tierName} subscription has been activated (${months} month(s), ${price(amountUgx)}). Valid until ${expiresOn}.`, html: layout(`Subscription activated`, body) });
}

export async function sendCreditReceipt(input: {
  to: string;
  businessName: string;
  amountUgx: number;
  creditsAdded: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, amountUgx, creditsAdded } = input;
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
  return sendEmail({ to, subject: "Credits added to your account", text: `${creditsAdded.toLocaleString()} credits (${price(amountUgx)}) were added to your account.`, html: layout("Credits added", body) });
}

export async function sendExpiryWarning(input: {
  to: string;
  businessName: string;
  tierName: string;
  expiresOn: string;
  graceEndsOn: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, businessName, tierName, expiresOn, graceEndsOn } = input;
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
  return sendEmail({ to, subject: "Your subscription is expiring", text: `Your ${tierName} subscription expires on ${expiresOn} (grace until ${graceEndsOn}). Please renew to avoid suspension.`, html: layout("Subscription expiring", body) });
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
