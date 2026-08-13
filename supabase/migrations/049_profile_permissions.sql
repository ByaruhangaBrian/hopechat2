-- 049_profile_permissions.sql
-- Add per-user menu-item permissions so owners/admins can scope what each
-- team member (agent or admin) can see and use. Agents default to NO access
-- to business configuration (AI Hub, Automations, Settings); the owner can
-- grant any module per user.
--
-- The column is intentionally nullable — the app normalizes null to the
-- role's default at runtime (see src/lib/permissions.ts). Existing rows are
-- backfilled here so the data is explicit for reporting/troubleshooting.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permissions jsonb;

-- Agents: operational modules only, no business configuration.
UPDATE public.profiles
SET permissions = '{
  "dashboard": true,
  "inbox": true,
  "contacts": true,
  "pipelines": true,
  "broadcasts": true,
  "automations": false,
  "ai": false,
  "settings": false
}'::jsonb
WHERE permissions IS NULL AND role = 'agent';

-- Admins default to full access; owners/superadmins are always full at
-- runtime regardless of stored value.
UPDATE public.profiles
SET permissions = '{
  "dashboard": true,
  "inbox": true,
  "contacts": true,
  "pipelines": true,
  "broadcasts": true,
  "automations": true,
  "ai": true,
  "settings": true
}'::jsonb
WHERE permissions IS NULL AND role = 'admin';
