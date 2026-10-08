-- 063_consent_backfill.sql
-- Task 16: One-off consent backfill — flip the enforcement switch
--
-- Runs ONLY after Tasks 14 and 15 are deployed. This is a data mutation and
-- requires human approval before applying (staging first, then production)
--
-- What it does, in order
--   1. Marks every business that exists at run time (the cutoff) as
--      consent_state='soft' — existing tenants keep working and see the
--      Task 15 notice until they accept. New signups remain 'required' via
--      the column default set in migration 062
--   2. Writes consent_gate.enforce_from in system_settings = now() at run
-- time. Before this the value is NULL and the proxy gate passes
--      everyone (nothing is hard-gated). After it, 'required' businesses
--      without a matching consent record are redirected to /consent
--
-- Design constraint (matches 062): scripts/run-migrations.mjs splits on
-- semicolons, so this file contains NO DO blocks and no semicolons inside
-- string literals or inline comments. Keep it that way.

-- ============================================================
-- 0. Pre-flight census (run before applying, same transaction context)
-- ============================================================
--    SELECT count(*) FROM businesses
-- After applying, the RETURNING row count of the UPDATE below must equal it.
-- (Prod census at plan time: 2 — "HopeChat", "Infinity WIFI". Assert the
-- actual count at run time, never hardcode IDs or names.)

-- ============================================================
-- 1. Existing businesses → soft
-- ============================================================

UPDATE businesses
SET consent_state = 'soft'
WHERE consent_state = 'required';

-- ============================================================
-- 2. Set the enforcement cutoff to now()
-- ============================================================
-- One-shot guard: only write enforce_from when it is still NULL, so a
-- re-run (or an accidental double-apply) never moves the cutoff backward.

UPDATE system_settings
SET value = jsonb_set(
  value,
  '{enforce_from}',
  to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::jsonb
)
WHERE id = 'consent_gate'
  AND (value ->> 'enforce_from') IS NULL;

-- ============================================================
-- Post-apply verification (manual, in order)
-- ============================================================
-- 1. SELECT consent_state, count(*) FROM businesses GROUP BY consent_state
--    -> 'soft' equals the pre-flight census, and 'required' is 0 unless
--       a new signup already landed
-- 2. SELECT value FROM system_settings WHERE id = 'consent_gate'
--    -> enforce_from equals the ISO timestamp ≈ the moment of apply
-- 3. New signup: create a fresh account -> business consent_state='required'
--    and /dashboard redirects to /consent until accepted
-- 4. Existing tenant: log in as a pre-existing user -> dashboard loads with
--    the Task 15 notice (not a /consent redirect). Accepting writes a
--    consent_records row with business_id + user_id and clears the notice