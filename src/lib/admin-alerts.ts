import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateAdminAlertInput {
  alertType: string;
  businessId?: string | null;
  severity?: "info" | "warning" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort insert into admin_alerts. Never throws — alert logging must
 * never break the primary flow (payments, email sends, cron jobs, etc.).
 */
export async function createAdminAlert(input: CreateAdminAlertInput): Promise<void> {
  try {
    const db = createAdminClient();
    const { error } = await db.from("admin_alerts").insert({
      alert_type: input.alertType,
      business_id: input.businessId ?? null,
      severity: input.severity ?? "info",
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.warn("[admin-alerts] Failed to create alert:", error.message);
    }
  } catch (err) {
    console.warn("[admin-alerts] Failed to create alert:", err instanceof Error ? err.message : err);
  }
}
