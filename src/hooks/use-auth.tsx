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
    try {
      const { data, error } = await supabase
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
            balance_ugx
          )
        `,
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[AuthProvider] fetchProfile error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      if (!data) return;

      let finalProfile = data as unknown as Profile;

      // If superadmin is impersonating, overlay the tenant's business data
      const imp = getImpersonationCookie();
      if (imp && finalProfile.is_superadmin) {
        const { data: tenantBiz } = await supabase
          .from("businesses")
          .select("name, features, credits_remaining, balance_ugx")
          .eq("id", imp.id)
          .maybeSingle();

        if (tenantBiz) {
          finalProfile = {
            ...finalProfile,
            business: tenantBiz as Profile["business"],
          };
        }
      }

      setProfile(finalProfile);
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
