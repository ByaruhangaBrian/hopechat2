import { NextResponse } from "next/server";
import { recordFunnelEvent, markEngaged, type FunnelStage } from "@/lib/onboarding-funnel";

/**
 * Records a lead-journey event so recovery emails can be sent later.
 *
 * This endpoint is intentionally unauthenticated — "email captured" fires
 * from the public signup form before an account exists. It only ever
 * advances a lead toward more-engaged stages and stores no sensitive data
 * beyond what the signup form already has (email / name / business).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, stage, full_name, business_name, user_id, business_id } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (stage !== "engaged") {
    const validStages: FunnelStage[] = [
      "email_captured",
      "signed_up",
      "onboarding_complete",
    ];
    if (typeof stage !== "string" || !validStages.includes(stage as FunnelStage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
  }

  if (stage === "engaged") {
    await markEngaged(email);
  } else {
    await recordFunnelEvent({
      email,
      stage: stage as FunnelStage,
      fullName: typeof full_name === "string" ? full_name : undefined,
      businessName: typeof business_name === "string" ? business_name : undefined,
      userId: typeof user_id === "string" ? user_id : undefined,
      businessId: typeof business_id === "string" ? business_id : undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
