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
  const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await response.json();

  // Pesapal returns HTTP 200 even on auth errors — check for error object
  if (data.error && (data.error.code || data.error.message)) {
    const msg = data.error.code || data.error.message || "unknown";
    throw new Error(`Pesapal auth rejected: ${msg}`);
  }

  if (!response.ok || !data.token) {
    throw new Error(`Pesapal auth failed (${response.status}): ${JSON.stringify(data)}`);
  }

  return data.token;
}

export interface PesapalOrderParams {
  id: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationId: string;
  billingEmail?: string;
  billingPhone?: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingCountryCode?: string;
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
  const response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: params.id,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: params.callbackUrl,
      notification_id: params.notificationId,
      billing_address: {
        email_address: params.billingEmail || "",
        phone_number: params.billingPhone || "",
        country_code: params.billingCountryCode || "UG",
        first_name: params.billingFirstName || "",
        last_name: params.billingLastName || "",
      },
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.redirect_url) {
    throw new Error(`Pesapal order creation failed: ${data.message || JSON.stringify(data)}`);
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
  statusCode: number; // 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
  statusDescription: string;
  amount: number;
  paymentMethod: string;
  confirmationCode: string;
}

export async function queryPesapalTransactionStatus(
  token: string,
  orderTrackingId: string,
  baseUrl: string
): Promise<PesapalTransactionStatus> {
  const response = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Pesapal status query failed: ${data.message || response.statusText}`);
  }

  return {
    orderTrackingId: orderTrackingId,
    merchantReference: data.merchant_reference || "",
    statusCode: data.status_code ?? -1,
    statusDescription: data.payment_status_description || "",
    amount: data.amount || 0,
    paymentMethod: data.payment_method || "",
    confirmationCode: data.confirmation_code || "",
  };
}

export interface PesapalIpnRegistration {
  ipnId: string;
  url: string;
}

export async function registerPesapalIpn(
  token: string,
  ipnUrl: string,
  baseUrl: string
): Promise<PesapalIpnRegistration> {
  const response = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "POST",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ipn_id) {
    throw new Error(`Pesapal IPN registration failed: ${data.message || JSON.stringify(data)}`);
  }

  return {
    ipnId: data.ipn_id,
    url: data.url || ipnUrl,
  };
}

export async function getPesapalRegisteredIpn(
  token: string,
  baseUrl: string
): Promise<Array<{ ipn_id: string; url: string; ipn_notification_type: string }>> {
  const response = await fetch(`${baseUrl}/api/URLSetup/GetIpnList`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Pesapal IPN list failed: ${data.message || response.statusText}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function getOrCreateIpnId(
  token: string,
  ipnUrl: string,
  baseUrl: string
): Promise<string> {
  // Check existing IPNs
  const existing = await getPesapalRegisteredIpn(token, baseUrl);
  const match = existing.find((ipn) => ipn.url === ipnUrl);
  if (match) {
    return match.ipn_id;
  }

  // Register new IPN
  const registered = await registerPesapalIpn(token, ipnUrl, baseUrl);
  return registered.ipnId;
}
