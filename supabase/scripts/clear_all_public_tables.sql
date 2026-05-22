-- WARNING: Destructive script
-- This truncates all tables in the `public` schema (CASCADE) and
-- resets sequences. Do NOT run against production unless you
-- absolutely intend to wipe data.
--
-- Usage (psql / supabase SQL editor as a service-role user):
-- psql "postgres://<service_role_key>@.../postgres" -f supabase/scripts/clear_all_public_tables.sql

BEGIN;

-- Adjust this list if there are public tables you want to preserve.
-- Empty array means "no excludes".
DO $$
DECLARE
  tbl RECORD;
  excludes TEXT[] := ARRAY[]::text[]; -- add table names here to skip, e.g. ARRAY['whitelist_table']
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (SELECT unnest(excludes))
  LOOP
    RAISE NOTICE 'Truncating public.%', tbl.tablename;
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl.tablename);
  END LOOP;
END$$;

-- Reset all public sequences to 1
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN
    SELECT sequence_schema, sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    RAISE NOTICE 'Resetting sequence % %.', s.sequence_schema, s.sequence_name;
    EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', s.sequence_schema, s.sequence_name);
  END LOOP;
END$$;

COMMIT;

-- Helpful note: auth schema (supabase auth.users) is NOT touched by this script.
-- Remove the file or protect it after use to avoid accidental execution.
