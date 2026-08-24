-- 050_fix_business_spreadsheets_delete.sql
--
-- Deletes on business_spreadsheets were silently affecting 0 rows on the
-- live database: the API returned success, the UI toasted "removed", but the
-- row was still there on next load. That is the signature of a missing or
-- drifted FOR DELETE policy (same failure class as Businesses_Delete fixed
-- in migration 047). Recreate all four policies idempotently so the live DB
-- matches migration 037 regardless of how it drifted.

drop policy if exists "Users can view their business spreadsheets" on business_spreadsheets;
create policy "Users can view their business spreadsheets"
  on business_spreadsheets for select
  using (business_id = get_user_business_id());

drop policy if exists "Users can insert their business spreadsheets" on business_spreadsheets;
create policy "Users can insert their business spreadsheets"
  on business_spreadsheets for insert
  with check (business_id = get_user_business_id());

drop policy if exists "Users can update their business spreadsheets" on business_spreadsheets;
create policy "Users can update their business spreadsheets"
  on business_spreadsheets for update
  using (business_id = get_user_business_id());

drop policy if exists "Users can delete their business spreadsheets" on business_spreadsheets;
create policy "Users can delete their business spreadsheets"
  on business_spreadsheets for delete
  using (business_id = get_user_business_id());
