import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const headers: Record<string, string> = {};
  
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const impersonatedId = cookies.find(c => c.trim().startsWith('impersonated_business_id='))?.split('=')[1];
    if (impersonatedId) {
      headers['x-impersonated-business-id'] = impersonatedId;
    }
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers,
      }
    }
  )

  return browserClient
}
