-- STACK ZERO V1 · PIN sync database
create table if not exists public.stack_zero_accounts (
  pin_hash text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stack_zero_accounts enable row level security;
revoke all on table public.stack_zero_accounts from anon, authenticated;
grant select, insert, update on table public.stack_zero_accounts to service_role;

-- The app accesses this table only through Vercel serverless functions
-- using SUPABASE_SERVICE_ROLE_KEY. Never expose that key in index.html.
