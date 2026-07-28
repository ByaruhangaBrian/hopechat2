-- 032_credit_system.sql
-- Seed the credit_costs system setting with default values.
-- Super admin can reconfigure these via the Admin Settings → Credits tab.

INSERT INTO system_settings (id, value, updated_at)
VALUES (
  'credit_costs',
  '{
    "ai_chat": { "credits": 1, "label": "Inbound AI Chat Session" },
    "interactive_form": { "credits": 1, "label": "Interactive Form / Flow" },
    "bulk_broadcast": { "credits": 15, "label": "Bulk Broadcast" },
    "credit_ugx_rate": 40
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
