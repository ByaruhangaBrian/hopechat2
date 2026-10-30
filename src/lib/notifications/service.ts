import { supabaseAdmin } from "@/lib/automations/admin-client";
import type { AppNotification } from "./types";

interface CreateNotificationParams {
  business_id?: string | null;
  user_id?: string | null;
  scope: "business" | "admin";
  category: "message" | "action_needed" | "subscription" | "system" | "billing";
  type: string;
  severity?: "info" | "warning" | "critical" | "success";
  title: string;
  message: string;
  link?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a persistent notification in the database.
 * Uses supabaseAdmin() so service-role / backend webhooks can call it reliably.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<AppNotification | null> {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("notifications")
      .insert({
        business_id: params.business_id || null,
        user_id: params.user_id || null,
        scope: params.scope,
        category: params.category,
        type: params.type,
        severity: params.severity || "info",
        title: params.title,
        message: params.message,
        link: params.link || null,
        action_label: params.action_label || null,
        metadata: params.metadata || {},
        is_read: false,
        dismissed: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      // If table doesn't exist yet, gracefully log and don't crash
      console.warn("[notifications] insert error:", error.message);
      return null;
    }

    return data as AppNotification;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[notifications] createNotification failed:", message);
    return null;
  }
}

/**
 * Live synthesis of urgent business notifications.
 * Evaluates real-time tenant state so critical action items (escalations,
 * unread customer chats, WhatsApp drops, depleted credits, expiring subs)
 * are immediately visible even before any asynchronous webhook runs.
 */
export async function getLiveBusinessNotifications(
  businessId: string,
): Promise<AppNotification[]> {
  const admin = supabaseAdmin();
  const liveItems: AppNotification[] = [];

  try {
    // 1. Check for Active Escalations / Human Takeover Needed
    const { data: escalations } = await admin
      .from("conversations")
      .select(
        `
        id,
        human_takeover,
        escalated,
        last_message_text,
        updated_at,
        contact:contacts (name, phone)
      `,
      )
      .eq("business_id", businessId)
      .or("human_takeover.eq.true,escalated.eq.true")
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (escalations && escalations.length > 0) {
      for (const conv of escalations) {
        const contact = conv.contact as { name?: string; phone?: string } | null;
        const contactName = contact?.name || contact?.phone || "Customer";
        liveItems.push({
          id: `live:escalation:${conv.id}`,
          business_id: businessId,
          scope: "business",
          category: "action_needed",
          type: "human_takeover",
          severity: "critical",
          title: "Human Takeover Needed",
          message: `${contactName} is waiting for assistance. AI reply has been paused for human takeover.`,
          link: `/inbox?c=${conv.id}`,
          action_label: "Open Chat",
          metadata: { conversation_id: conv.id },
          is_read: false,
          created_at: conv.updated_at || new Date().toISOString(),
          is_live_synthesized: true,
        });
      }
    }

    // 2. Check for Unread Inbound Messages Waiting
    const { data: unreadConvs } = await admin
      .from("conversations")
      .select(
        `
        id,
        unread_count,
        last_message_text,
        last_message_at,
        updated_at,
        contact:contacts (name, phone)
      `,
      )
      .eq("business_id", businessId)
      .gt("unread_count", 0)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(5);

    if (unreadConvs && unreadConvs.length > 0) {
      for (const conv of unreadConvs) {
        // Skip if already flagged as escalation
        if (liveItems.some((item) => item.metadata?.conversation_id === conv.id)) {
          continue;
        }
        const contact = conv.contact as { name?: string; phone?: string } | null;
        const contactName = contact?.name || contact?.phone || "Contact";
        const preview = conv.last_message_text
          ? `"${conv.last_message_text.slice(0, 60)}${conv.last_message_text.length > 60 ? "..." : ""}"`
          : "New message received.";
        liveItems.push({
          id: `live:unread:${conv.id}`,
          business_id: businessId,
          scope: "business",
          category: "message",
          type: "new_message",
          severity: "info",
          title: `New message from ${contactName}`,
          message: `${preview} (${conv.unread_count} unread)`,
          link: `/inbox?c=${conv.id}`,
          action_label: "Reply Now",
          metadata: { conversation_id: conv.id },
          is_read: false,
          created_at: conv.last_message_at || conv.updated_at || new Date().toISOString(),
          is_live_synthesized: true,
        });
      }
    }

    // 3. Check WhatsApp Cloud API Connection Health
    const { data: waConfig } = await admin
      .from("whatsapp_config")
      .select("status, updated_at")
      .eq("business_id", businessId)
      .maybeSingle();

    if (!waConfig || waConfig.status !== "connected") {
      liveItems.push({
        id: `live:whatsapp:${businessId}`,
        business_id: businessId,
        scope: "business",
        category: "action_needed",
        type: "whatsapp_disconnect",
        severity: "critical",
        title: "WhatsApp Offline / Disconnected",
        message:
          "Your WhatsApp Business API is not connected. Connect your phone number to send and receive messages.",
        link: "/settings?tab=whatsapp",
        action_label: "Connect WhatsApp",
        is_read: false,
        created_at: waConfig?.updated_at || new Date().toISOString(),
        is_live_synthesized: true,
      });
    }

    // 4. Check Credits Balance
    const { data: business } = await admin
      .from("businesses")
      .select("credits_remaining, balance_ugx, name, plan_tier")
      .eq("id", businessId)
      .maybeSingle();

    if (business) {
      const credits = business.credits_remaining ?? 0;
      if (credits <= 0) {
        liveItems.push({
          id: `live:credits_zero:${businessId}`,
          business_id: businessId,
          scope: "business",
          category: "billing",
          type: "zero_credits",
          severity: "critical",
          title: "Zero Credits Remaining",
          message:
            "Your message credits have run out. Automated AI replies and outbound broadcasts are currently paused.",
          link: "/settings?tab=subscription",
          action_label: "Top Up Credits",
          is_read: false,
          created_at: new Date().toISOString(),
          is_live_synthesized: true,
        });
      } else if (credits < 50) {
        liveItems.push({
          id: `live:credits_low:${businessId}`,
          business_id: businessId,
          scope: "business",
          category: "billing",
          type: "low_credits",
          severity: "warning",
          title: "Low Message Credits",
          message: `You only have ${credits} credits remaining. Top up soon to avoid automated reply disruptions.`,
          link: "/settings?tab=subscription",
          action_label: "Add Credits",
          is_read: false,
          created_at: new Date().toISOString(),
          is_live_synthesized: true,
        });
      }
    }

    // 5. Check Subscription Expiry / Grace Period
    const { data: sub } = await admin
      .from("subscriptions")
      .select("expires_on, grace_ends_on, tier_id, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.expires_on) {
      const now = new Date();
      const expires = new Date(sub.expires_on);
      const graceEnds = sub.grace_ends_on ? new Date(sub.grace_ends_on) : null;
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / msPerDay);

      if (graceEnds && now > graceEnds) {
        liveItems.push({
          id: `live:sub_ended:${businessId}`,
          business_id: businessId,
          scope: "business",
          category: "subscription",
          type: "subscription_expired",
          severity: "critical",
          title: "Subscription Expired",
          message:
            "Your plan and grace period have expired. Renew your plan now to regain full dashboard access.",
          link: "/settings?tab=subscription",
          action_label: "Renew Now",
          is_read: false,
          created_at: sub.created_at || now.toISOString(),
          is_live_synthesized: true,
        });
      } else if (now > expires) {
        liveItems.push({
          id: `live:sub_grace:${businessId}`,
          business_id: businessId,
          scope: "business",
          category: "subscription",
          type: "subscription_grace_period",
          severity: "warning",
          title: "Subscription in Grace Period",
          message: `Your subscription ended on ${sub.expires_on}. Please renew before the grace period ends.`,
          link: "/settings?tab=subscription",
          action_label: "Renew Plan",
          is_read: false,
          created_at: sub.created_at || now.toISOString(),
          is_live_synthesized: true,
        });
      } else if (daysUntilExpiry <= 5 && daysUntilExpiry >= 0) {
        liveItems.push({
          id: `live:sub_expiring:${businessId}`,
          business_id: businessId,
          scope: "business",
          category: "subscription",
          type: "subscription_expiring",
          severity: daysUntilExpiry <= 2 ? "critical" : "warning",
          title: "Subscription Expiring Soon",
          message: `Your plan expires in ${daysUntilExpiry === 0 ? "today" : `${daysUntilExpiry} days`} (${sub.expires_on}). Renew now to prevent interruption.`,
          link: "/settings?tab=subscription",
          action_label: "Renew Plan",
          is_read: false,
          created_at: sub.created_at || now.toISOString(),
          is_live_synthesized: true,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notifications] getLiveBusinessNotifications error:", message);
  }

  return liveItems;
}

/**
 * Live synthesis of system-wide notifications for Super Admins.
 * Surfaces high-priority platform events:
 * - Disconnected WhatsApp accounts across tenants
 * - Expiring tenant subscriptions
 * - Failed payment transactions
 * - Newly registered businesses
 * - Alerts from `admin_alerts`
 */
export async function getLiveAdminNotifications(): Promise<AppNotification[]> {
  const admin = supabaseAdmin();
  const liveItems: AppNotification[] = [];

  try {
    // 1. Fetch unread admin_alerts
    const { data: alerts } = await admin
      .from("admin_alerts")
      .select("id, alert_type, severity, title, message, business_id, created_at, metadata")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (alerts && alerts.length > 0) {
      for (const a of alerts) {
        liveItems.push({
          id: a.id,
          business_id: a.business_id,
          scope: "admin",
          category: "system",
          type: a.alert_type || "system_alert",
          severity: (a.severity as AppNotification["severity"]) || "info",
          title: a.title,
          message: a.message,
          link: a.business_id ? `/admin` : `/admin/activity`,
          action_label: "View in Admin",
          metadata: a.metadata as Record<string, unknown> | undefined,
          is_read: false,
          created_at: a.created_at,
          is_live_synthesized: false,
        });
      }
    }

    // 2. Disconnected WhatsApp across tenants
    const { data: waIssues, count: disconnectedCount } = await admin
      .from("whatsapp_config")
      .select(
        `
        id,
        business_id,
        status,
        updated_at,
        businesses (name)
      `,
        { count: "exact" },
      )
      .eq("status", "disconnected")
      .limit(5);

    if (disconnectedCount && disconnectedCount > 0) {
      const sampleNames = (waIssues || [])
        .map((w) => (w.businesses as unknown as Array<{ name?: string }>)?.[0]?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");

      liveItems.push({
        id: `live:admin:whatsapp_outage`,
        scope: "admin",
        category: "action_needed",
        type: "system_whatsapp_outage",
        severity: "critical",
        title: `${disconnectedCount} WhatsApp Account${disconnectedCount > 1 ? "s" : ""} Disconnected`,
        message: `${sampleNames || "Tenants"} currently have offline WhatsApp connections needing review.`,
        link: "/admin",
        action_label: "Review Tenants",
        is_read: false,
        created_at: new Date().toISOString(),
        is_live_synthesized: true,
      });
    }

    // 3. Failed payment transactions in the last 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: failedTxs, count: failedCount } = await admin
      .from("payment_transactions")
      .select(
        `
        id,
        amount_ugx,
        business_id,
        timestamp,
        businesses (name)
      `,
        { count: "exact" },
      )
      .eq("status", "failed")
      .gte("timestamp", twoDaysAgo)
      .limit(3);

    if (failedCount && failedCount > 0) {
      liveItems.push({
        id: `live:admin:failed_payments`,
        scope: "admin",
        category: "billing",
        type: "payment_failed",
        severity: "critical",
        title: `${failedCount} Failed Payment${failedCount > 1 ? "s" : ""} (Last 48h)`,
        message: `Recent billing transactions failed on the payment gateway. Check audit logs.`,
        link: "/admin",
        action_label: "Review Billing",
        is_read: false,
        created_at: failedTxs?.[0]?.timestamp || new Date().toISOString(),
        is_live_synthesized: true,
      });
    }

    // 4. Expiring tenant subscriptions (within 3 days or in grace period)
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: expiringSubs, count: expiringCount } = await admin
      .from("subscriptions")
      .select(
        `
        id,
        expires_on,
        grace_ends_on,
        business_id,
        businesses (name)
      `,
        { count: "exact" },
      )
      .lte("expires_on", inThreeDays)
      .gte("grace_ends_on", today)
      .limit(4);

    if (expiringCount && expiringCount > 0) {
      const expiringBizNames = (expiringSubs || [])
        .map((s) => (s.businesses as unknown as Array<{ name?: string }>)?.[0]?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");

      liveItems.push({
        id: `live:admin:expiring_subs`,
        scope: "admin",
        category: "subscription",
        type: "tenants_expiring",
        severity: "warning",
        title: `${expiringCount} Tenant Subscription${expiringCount > 1 ? "s" : ""} Expiring`,
        message: `${expiringBizNames || "Tenants"} will reach end-of-term or grace period within 3 days.`,
        link: "/admin",
        action_label: "Manage Accounts",
        is_read: false,
        created_at: new Date().toISOString(),
        is_live_synthesized: true,
      });
    }

    // 5. New Business Registrations in the last 48 hours
    const { data: newTenants, count: newCount } = await admin
      .from("businesses")
      .select("id, name, created_at", { count: "exact" })
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(3);

    if (newCount && newCount > 0) {
      const tenantList = (newTenants || []).map((b) => b.name).join(", ");
      liveItems.push({
        id: `live:admin:new_tenants`,
        scope: "admin",
        category: "system",
        type: "new_tenant_joined",
        severity: "info",
        title: `${newCount} New Business${newCount > 1 ? "es" : ""} Registered`,
        message: `Recently onboarded: ${tenantList || "New signups"}.`,
        link: "/admin",
        action_label: "View Tenants",
        is_read: false,
        created_at: newTenants?.[0]?.created_at || new Date().toISOString(),
        is_live_synthesized: true,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notifications] getLiveAdminNotifications error:", message);
  }

  return liveItems;
}
