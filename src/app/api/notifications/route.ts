import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import {
  getLiveBusinessNotifications,
  getLiveAdminNotifications,
} from "@/lib/notifications/service";
import type { AppNotification } from "@/lib/notifications/types";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, business_id, is_superadmin")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperAdmin =
      user.app_metadata?.is_superadmin === true ||
      profile?.is_superadmin === true ||
      profile?.role === "superadmin";

    const { searchParams } = new URL(req.url);
    const requestedScope = searchParams.get("scope");
    const requestedView = searchParams.get("view");
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const isAdminView =
      isSuperAdmin && (requestedScope === "admin" || requestedView === "admin");

    const admin = supabaseAdmin();
    let notifications: AppNotification[] = [];

    if (isAdminView) {
      // 1. Fetch DB notifications for admin
      let dbNotifications: AppNotification[] = [];
      try {
        const { data: dbRows, error: dbErr } = await admin
          .from("notifications")
          .select("*")
          .eq("scope", "admin")
          .eq("dismissed", false)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!dbErr && dbRows) {
          dbNotifications = dbRows as AppNotification[];
        }
      } catch (err) {
        console.warn("[notifications-api] db fetch error:", err);
      }

      // 2. Fetch live system notifications
      const liveNotifications = await getLiveAdminNotifications();

      // Merge and deduplicate
      const seenKeys = new Set<string>();
      for (const item of dbNotifications) {
        seenKeys.add(item.id);
        if (typeof item.metadata?.live_id === "string") seenKeys.add(item.metadata.live_id);
        notifications.push(item);
      }

      for (const liveItem of liveNotifications) {
        if (!seenKeys.has(liveItem.id)) {
          seenKeys.add(liveItem.id);
          notifications.push(liveItem);
        }
      }
    } else {
      // Business scope
      let businessId = profile?.business_id;

      // Handle Super Admin Impersonation
      if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impId = cookieStore.get("impersonated_business_id")?.value;
        if (impId) {
          businessId = impId;
        }
      }

      if (!businessId) {
        return NextResponse.json(
          { notifications: [], unread_count: 0, scope: "business" },
          { headers: NO_CACHE_HEADERS },
        );
      }

      // 1. Fetch DB notifications for business
      let dbNotifications: AppNotification[] = [];
      try {
        const { data: dbRows, error: dbErr } = await admin
          .from("notifications")
          .select("*")
          .eq("business_id", businessId)
          .eq("scope", "business")
          .eq("dismissed", false)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!dbErr && dbRows) {
          dbNotifications = dbRows as AppNotification[];
        }
      } catch (err) {
        console.warn("[notifications-api] db fetch error:", err);
      }

      // 2. Fetch live synthesized business notifications
      const liveNotifications = await getLiveBusinessNotifications(businessId);

      // Merge: if a live notification has a corresponding entry in DB, adopt DB read state
      const dbKeyMap = new Map<string, AppNotification>();
      for (const item of dbNotifications) {
        dbKeyMap.set(item.id, item);
        if (typeof item.metadata?.live_id === "string") {
          dbKeyMap.set(item.metadata.live_id, item);
        }
      }

      for (const liveItem of liveNotifications) {
        const existing = dbKeyMap.get(liveItem.id);
        if (existing) {
          // If already in DB and dismissed, skip
          if (existing.dismissed) continue;
          // Use the DB record (respecting user's read status)
          notifications.push(existing);
          dbKeyMap.delete(existing.id);
        } else {
          notifications.push(liveItem);
        }
      }

      // Append remaining persistent DB notifications not in live items
      for (const [key, item] of dbKeyMap.entries()) {
        if (key === item.id && !notifications.some((n) => n.id === item.id)) {
          notifications.push(item);
        }
      }
    }

    // Sort combined notifications by created_at descending
    notifications.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Compute unread count before filters
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    // Apply view filters
    if (filter === "unread") {
      notifications = notifications.filter((n) => !n.is_read);
    } else if (filter === "actions") {
      notifications = notifications.filter(
        (n) =>
          n.category === "action_needed" ||
          n.severity === "critical" ||
          n.type === "human_takeover",
      );
    }

    // Slice to limit
    notifications = notifications.slice(0, limit);

    return NextResponse.json(
      {
        notifications,
        unread_count: unreadCount,
        scope: isAdminView ? "admin" : "business",
      },
      { headers: NO_CACHE_HEADERS },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[notifications-api] GET error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, business_id, is_superadmin")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperAdmin =
      user.app_metadata?.is_superadmin === true ||
      profile?.is_superadmin === true ||
      profile?.role === "superadmin";

    const body = await req.json();
    const { id, is_read = true, mark_all_read, scope = "business" } = body;

    const admin = supabaseAdmin();

    if (mark_all_read) {
      if (scope === "admin" && isSuperAdmin) {
        // Mark admin notifications read
        await admin
          .from("notifications")
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq("scope", "admin")
          .eq("is_read", false);

        // Also mark admin_alerts as read
        await admin
          .from("admin_alerts")
          .update({ is_read: true })
          .eq("is_read", false);
      } else {
        let businessId = profile?.business_id;
        if (isSuperAdmin) {
          const cookieStore = await cookies();
          const impId = cookieStore.get("impersonated_business_id")?.value;
          if (impId) businessId = impId;
        }

        if (businessId) {
          await admin
            .from("notifications")
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq("business_id", businessId)
            .eq("is_read", false);

          // For active live notifications that aren't yet in DB, record an entry marked read
          // so they don't count towards unread in subsequent calls
          const liveItems = await getLiveBusinessNotifications(businessId);
          for (const item of liveItems) {
            await admin.from("notifications").upsert(
              {
                business_id: businessId,
                scope: "business",
                category: item.category,
                type: item.type,
                severity: item.severity,
                title: item.title,
                message: item.message,
                link: item.link,
                action_label: item.action_label,
                metadata: { ...item.metadata, live_id: item.id },
                is_read: true,
                dismissed: false,
              },
              { onConflict: "id", ignoreDuplicates: true },
            );
          }
        }
      }

      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    // Handling individual notification read/unread
    if (typeof id === "string" && id.startsWith("live:")) {
      // Store in DB as read
      let businessId = profile?.business_id;
      if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impId = cookieStore.get("impersonated_business_id")?.value;
        if (impId) businessId = impId;
      }

      await admin.from("notifications").insert({
        business_id: businessId || null,
        scope: scope === "admin" ? "admin" : "business",
        category: "action_needed",
        type: "live_item",
        severity: "info",
        title: "Live Notification",
        message: "Read",
        metadata: { live_id: id },
        is_read: is_read,
        dismissed: false,
      });
    } else {
      // Check if it's an admin_alert ID
      const { data: alertUpdated } = await admin
        .from("admin_alerts")
        .update({ is_read: is_read })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (!alertUpdated) {
        await admin
          .from("notifications")
          .update({ is_read: is_read, updated_at: new Date().toISOString() })
          .eq("id", id);
      }
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[notifications-api] PATCH error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    if (id.startsWith("live:")) {
      // Store dismissal marker in DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, is_superadmin")
        .eq("user_id", user.id)
        .maybeSingle();

      let businessId = profile?.business_id;
      if (profile?.is_superadmin) {
        const cookieStore = await cookies();
        const impId = cookieStore.get("impersonated_business_id")?.value;
        if (impId) businessId = impId;
      }

      await admin.from("notifications").insert({
        business_id: businessId || null,
        scope: "business",
        category: "action_needed",
        type: "live_item",
        severity: "info",
        title: "Dismissed Item",
        message: "Dismissed",
        metadata: { live_id: id },
        is_read: true,
        dismissed: true,
      });
    } else {
      await admin
        .from("notifications")
        .update({ dismissed: true, updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[notifications-api] DELETE error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}
