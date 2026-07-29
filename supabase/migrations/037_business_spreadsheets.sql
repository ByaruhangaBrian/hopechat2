-- Migration 037: Multiple Google Spreadsheets per business
-- Each business can connect N spreadsheets, each with its own name, description, and config.
-- Auth (service account) remains in business_integrations — one Google auth per business.

create table business_spreadsheets (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  spreadsheet_id text not null,
  sheet_name text not null default 'Sheet1',
  reference_column text not null default 'Phone Number',
  return_columns text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_business_spreadsheets_business on business_spreadsheets(business_id);
create index idx_business_spreadsheets_enabled on business_spreadsheets(business_id, is_enabled);

alter table business_spreadsheets enable row level security;

create policy "Users can view their business spreadsheets"
  on business_spreadsheets for select
  using (business_id = get_user_business_id());

create policy "Users can insert their business spreadsheets"
  on business_spreadsheets for insert
  with check (business_id = get_user_business_id());

create policy "Users can update their business spreadsheets"
  on business_spreadsheets for update
  using (business_id = get_user_business_id());

create policy "Users can delete their business spreadsheets"
  on business_spreadsheets for delete
  using (business_id = get_user_business_id());
