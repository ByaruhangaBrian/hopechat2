-- 054_tests_routing.sql
-- Adds routing-aware fields to `tests`:
--   - is_entry: this test is the ENTRY/SCREENING test. Its intro_fields are
--     the routing questions (e.g. class, subject). It has no questions of its
--     own; after the student answers every intro field, the system routes to
--     the test whose route_rules match the answers.
--   - route_rules: JSONB object of { fieldKey: expectedValue } that marks a
--     test as a routing target, e.g. {"class": "O Level", "subject": "Math"}.

alter table public.tests
  add column if not exists is_entry boolean not null default false,
  add column if not exists route_rules jsonb;

-- Index to speed up the routing lookup (tests.route_rules @> ?).
create index if not exists tests_route_rules_gin on public.tests using gin (route_rules);