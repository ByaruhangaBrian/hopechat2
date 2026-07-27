import { createAdminClient } from "@/lib/supabase/admin";

export interface PesapalSettings {
  consumer_key: string;
  consumer_secret: string;
  site_url: string; // "live.pesapal.com" | "demo.pesapal.com"
  is_enabled: boolean;
}

const PESAPAL_BASE_URLS: Record<string, string> = {
  "live.pesapal.com": "https://pay.pesapal.com/v3",
  "demo.pesapal.com": "https://cybqa.pesapal.com/pesapalv3",
};

export function getPesapalBaseUrl(siteUrl: string): string {
  return PESAPAL_BASE_URLS[siteUrl] || PESAPAL_BASE_URLS["live.pesapal.com"];
}

export async function getPesapalSettings(): Promise<PesapalSettings> {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("system_settings")
    .select("value")
    .eq("id", "pesapal_global")
    .maybeSingle();

  const dbSettings = data?.value;

  return {
    consumer_key: dbSettings?.consumer_key || process.env.PESAPAL_CONSUMER_KEY || "",
    consumer_secret: dbSettings?.consumer_secret || process.env.PESAPAL_CONSUMER_SECRET || "",
    site_url: dbSettings?.site_url || "live.pesapal.com",
    is_enabled: dbSettings?.is_enabled ?? false,
  };
}

export async function authenticatePesapal(
  consumerKey: string,
  consumerSecret: string,
  baseUrl: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/Auth/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(`Pesapal auth failed: ${data.message || response.statusText}`);
  }

  return data.token;
}

export interface PesapalOrderParams {
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  merchantReference: string;
  billingEmail?: string;
  billingFirstName?: string;
  billingLastName?: string;
}

export interface PesapalOrderResult {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

export async function createPesapalOrder(
  token: string,
  params: PesapalOrderParams,
  baseUrl: string
): Promise<PesapalOrderResult> {
  const response = await fetch(`${baseUrl}/api/Orders/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      callback_url: params.callbackUrl,
      merchant_reference: params.merchantReference,
      billing_email_address: params.billingEmail || "",
      billing_first_name: params.billingFirstName || "",
      billing_last_name: params.billingLastName || "",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.redirect_url) {
    throw new Error(`Pesapal order creation failed: ${data.message || response.statusText}`);
  }

  return {
    orderTrackingId: data.order_tracking_id,
    merchantReference: data.merchant_reference,
    redirectUrl: data.redirect_url,
  };
}

export interface PesapalTransactionStatus {
  orderTrackingId: string;
  merchantReference: string;
  status: string; // "0" = completed, "1" = pending, "2" = failed
  statusDescription: string;
}

export async function queryPesapalTransactionStatus(
  token: string,
  orderTrackingId: string,
  merchantReference: string,
  baseUrl: string
): Promise<PesapalTransactionStatus> {
  const response = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      OrderTrackingId: orderTrackingId,
      OrderMerchantReference: merchantReference,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Pesapal status query failed: ${data.message || response.statusText}`);
  }

  return {
    orderTrackingId: data.order_tracking_id || orderTrackingId,
    merchantReference: data.merchant_reference || merchantReference,
    status: String(data.status),
    statusDescription: data.status_description || "",
  };
}
