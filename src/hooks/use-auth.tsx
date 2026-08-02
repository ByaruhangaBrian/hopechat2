"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface BusinessSubscription {
  id: string;
  tier_id: string;
  period_months: number;
  amount_ugx: number;
  starts_on: string;
  expires_on: string;
  grace_ends_on: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string | null;
  business_id: string | null;
  is_superadmin: boolean;
  business?: {
    name: string;
    features: Record<string, boolean>;
    credits_remaining: number;
    balance_ugx: number;
    tier_id: string;
    plan_tier: string;
    status: string;
    subscriptions?: BusinessSubscription[];
  };
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** True when the superadmin is viewing a tenant's dashboard */
  impersonating: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getImpersonationCookie(): { id: string; name: string } | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  const idCookie = cookies.find((c) =>
    c.trim().startsWith("impersonated_business_id="),
  );
  const nameCookie = cookies.find((c) =>
    c.trim().startsWith("impersonated_business_name="),
  );
  if (!idCookie) return null;
  return {
    id: idCookie.trim().split("=")[1],
    name: nameCookie
      ? decodeURIComponent(nameCookie.split("=")[1])
      : "Unknown",
  };
}

/**
 * AuthProvider — wrap this around the dashboard layout.
 * Makes ONE getSession() call for the whole tree instead of one per
 * component, avoiding internal lock contention in the Supabase client.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const imp = getImpersonationCookie();

    try {
      let result;

      if (imp) {
        // Impersonating: show the TENANT's profile (oldest = likely owner)
        // RLS allows this because get_user_business_id() returns imp.id
        result = await supabase
          .from("profiles")
          .select(
            `
            id,
            full_name,
            email,
            avatar_url,
            role,
            business_id,
            is_superadmin,
            business:businesses (
              name,
              features,
              credits_remaining,
              balance_ugx,
              tier_id,
              plan_tier,
              status,
              subscriptions (
                id,
                tier_id,
                period_months,
                amount_ugx,
                starts_on,
                expires_on,
                grace_ends_on,
                created_at
              )
            )
          `,
          )
          .eq("business_id", imp.id)
          .order("created_at", { ascending: true })
          .order("created_at", { foreignTable: "business.subscriptions", ascending: false })
          .limit(1)
          .maybeSingle();
      } else {
        // Normal: show the authenticated user's own profile
        result = await supabase
          .from("profiles")
          .select(
            `
            id,
            full_name,
            email,
            avatar_url,
            role,
            business_id,
            is_superadmin,
            business:businesses (
              name,
              features,
              credits_remaining,
              balance_ugx,
              tier_id,
              plan_tier,
              status,
              subscriptions (
                id,
                tier_id,
                period_months,
                amount_ugx,
                starts_on,
                expires_on,
                grace_ends_on,
                created_at
              )
            )
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { foreignTable: "business.subscriptions", ascending: false })
          .maybeSingle();
      }

      if (result.error) {
        console.error("[AuthProvider] fetchProfile error:", {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
        });
        return;
      }

      if (result.data) setProfile(result.data as unknown as Profile);
    } catch (err) {
      console.error("[AuthProvider] fetchProfile threw:", err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("[AuthProvider] getSession() timed out after 3s");
        setLoading(false);
      }
    }, 3000);

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error)
          console.error("[AuthProvider] getSession error:", error.message);

        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error("[AuthProvider] init threw:", err);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const impersonating = !!getImpersonationCookie();

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refreshProfile, impersonating }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — read the shared auth state from context.
 * Must be used inside an <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      loading: false,
      signOut: async () => {
        window.location.href = "/login";
      },
      refreshProfile: async () => {},
      impersonating: false,
    };
  }
  return ctx;
}
