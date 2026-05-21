-- AI Settings table for storing per-user AI configuration and training data
create table ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  groq_api_key text not null, -- Encrypted via middleware
  system_prompt text not null default 'You are a helpful customer service AI assistant. Respond to customer inquiries promptly and professionally.',
  training_documents text[], -- Array of training document texts
  is_enabled boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Add AI-handled flag to messages table to track which messages were responded to by AI
alter table messages add column if not exists ai_handled boolean default false;
alter table messages add column if not exists is_ai_response boolean default false;

-- Add AI settings to conversations to track if AI is active for this conversation
alter table conversations add column if not exists ai_enabled boolean default false;

create index if not exists idx_ai_settings_user_id on ai_settings(user_id);
