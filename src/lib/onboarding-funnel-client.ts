import type { FunnelStage } from "@/lib/onboarding-funnel";

/**
 * Fire-and-forget browser hook into /api/onboarding-funnel. Never blocks
 * or throws — tracking failures must not affect the signup flow.
 */
export function trackFunnelEvent(input: {
  email: string;
  stage: FunnelStage;
  fullName?: string | null;
  businessName?: string | null;
  userId?: string | null;
  businessId?: string | null;
}): void {
  const email = input.email?.trim();
  if (!email || !email.includes("@")) return;

  void fetch("/api/onboarding-funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      stage: input.stage,
      full_name: input.fullName ?? null,
      business_name: input.businessName ?? null,
      user_id: input.userId ?? null,
      business_id: input.businessId ?? null,
    }),
  }).catch(() => {});
}
