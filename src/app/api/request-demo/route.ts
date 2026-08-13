import { NextResponse } from "next/server";
import { logHttpEvent } from "@/lib/logs/http-logs";
import {
  sendDemoRequestNotification,
  sendDemoRequestConfirmation,
} from "@/lib/email";

const ALLOWED_SERVICES = [
  "meta-config",
  "automation-setup",
  "ai-training",
  "broadcast-setup",
  "team-training",
  "integrations",
  "other",
];

const MAX_LEN = 500;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_LEN) : "");
    const name = clean(body?.name);
    const businessName = clean(body?.businessName);
    const companySize = clean(body?.companySize);
    const phone = clean(body?.phone);
    const email = clean(body?.email).toLowerCase();
    const message = clean(body?.message);
    const services = Array.isArray(body?.services)
      ? [
          ...new Set(
            (body.services as unknown[])
              .filter((s): s is string => typeof s === "string" && ALLOWED_SERVICES.includes(s))
          ),
        ]
      : [];

    if (!name || !businessName || !companySize || !phone || !email) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const notification = await sendDemoRequestNotification({
      name,
      businessName,
      companySize,
      phone,
      email,
      services,
      message,
    });

    if (notification.ok) {
      await sendDemoRequestConfirmation({ to: email, name, businessName });
    }

    void logHttpEvent({
      direction: "incoming",
      service: "system",
      endpoint: "/api/request-demo",
      statusCode: notification.ok ? 200 : 500,
      payload: { name, businessName, companySize, phone, email, services },
      note: notification.ok ? "demo_request_received" : "demo_request_email_failed",
    });

    if (!notification.ok) {
      return NextResponse.json(
        { error: "We couldn't send your request right now. Please reach us directly at hopetechsolutionsltd@gmail.com or call/WhatsApp +256 763 149 276." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request demo route error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
