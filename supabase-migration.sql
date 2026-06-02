-- Executar no Supabase Dashboard → SQL Editor

create table if not exists journal_entries (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  date_key   text        not null,          -- formato: YYYY-MM-DD
  data       jsonb       not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date_key)
);

-- Row Level Security: cada usuário acessa só os próprios dados
alter table journal_entries enable row level security;

create policy "users_own_entries"
  on journal_entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índice para buscas rápidas por usuário + data
create index if not exists idx_journal_entries_user_date
  on journal_entries (user_id, date_key);
