import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  // Custom fetch to dynamically inject headers based on current context (pathname + cookies)
  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const cookies = document.cookie.split(';');
      
      // 1. Handle Impersonation
      const impersonatedId = cookies.find(c => c.trim().startsWith('impersonated_business_id='))?.split('=')[1];
      if (impersonatedId) {
        headers.set('x-impersonated-business-id', impersonatedId);
      }

      // 2. Handle Admin View All Mode
      // Only inject the 'view all' capability if we are explicitly in the admin portal.
      // This ensures the dashboard always stays strictly isolated even for superadmins.
      if (pathname.startsWith('/admin')) {
        headers.set('x-admin-view-all', 'true');
      }
    }

    return fetch(input, { ...init, headers });
  };

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      global: {
        fetch: customFetch,
      }
    }
  )

  return browserClient
}
