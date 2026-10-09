-- 064_consent_settings_visibility.sql
--
-- Fix: consent gate silently failed OPEN because RLS hid its config.
--
-- The consent gate (src/lib/consent/check.ts, run from src/proxy.ts) and the
-- consent UI (/api/consent/status, /api/consent/accept, the Task 15 notice)
-- all read system_settings through the *authenticated user's* client. But
-- migration 022 restricted the "Everyone can view system settings" SELECT
-- policy to only:
--
--     id IN ('system_config', 'integrations_global', 'whatsapp_global')
--
-- so `consent_gate` and `legal_versions` always read back as [] for normal
-- users. Consequences:
--   * getConsentGateDecision() saw no `consent_gate` row, treated the cutoff
--     as absent, and returned 'ok' for everyone. A 'required' (post-cutoff)
--     tenant was therefore NEVER redirected to /consent — Tasks 14/16 could
--     not gate. (Confirmed on staging 2026-10-09: a freshly provisioned
--     'required' business reached /dashboard with HTTP 200.)
--   * /api/consent/status and /api/consent/accept fell back to the hardcoded
--     version 1 instead of the stored legal_versions.
--
-- Both rows are public, non-sensitive configuration and safe to expose:
--   consent_gate   -> { "enforce_from": <ISO timestamp|null> }
--   legal_versions -> { terms_version, privacy_version, *_updated_at }
--
-- It is safe to run anywhere (idempotent: drops and recreates one policy).
-- No DO blocks and no semicolons inside literals/comments (matches 062/063,
-- required by scripts/run-migrations.mjs).

DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;

CREATE POLICY "Everyone can view system settings" ON system_settings
  FOR SELECT USING (
    id IN (
      'system_config',
      'integrations_global',
      'whatsapp_global',
      'consent_gate',
      'legal_versions'
    )
  );

-- ============================================================
-- Post-apply verification (manual, in order)
-- ============================================================
-- 1. As a non-superadmin authenticated user, read the two rows:
--      GET /rest/v1/system_settings?select=id&id=in.(consent_gate,legal_versions)
--    -> returns BOTH ids (previously returned []).
-- 2. A 'required' (post-cutoff) tenant hitting /dashboard is redirected to
--    /consent until it accepts.
-- 3. The Task 15 notice still appears for a 'soft' tenant.
