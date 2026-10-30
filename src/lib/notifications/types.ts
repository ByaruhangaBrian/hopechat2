export type NotificationScope = 'business' | 'admin';

export type NotificationCategory =
  | 'message'
  | 'action_needed'
  | 'subscription'
  | 'system'
  | 'billing';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AppNotification {
  id: string;
  business_id?: string | null;
  business_name?: string | null;
  user_id?: string | null;
  scope: NotificationScope;
  category: NotificationCategory;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  dismissed?: boolean;
  created_at: string;
  updated_at?: string;
  is_live_synthesized?: boolean;
}

export type NotificationFilter = 'all' | 'unread' | 'actions';
