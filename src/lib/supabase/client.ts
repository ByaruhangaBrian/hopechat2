import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Initialize impersonation if cookie is present
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const impersonatedId = cookies.find(c => c.trim().startsWith('impersonated_business_id='))?.split('=')[1];
    
    if (impersonatedId) {
      browserClient.rpc('set_impersonation', { business_id: impersonatedId })
        .then(({ error }) => {
          if (error) console.error("Failed to set impersonation context:", error);
        });
    }
  }

  return browserClient
}
