-- Mindsfire App - MVP Supabase schema (DEV)
-- Safe to commit: contains no secrets. Run this in Supabase SQL Editor for your DEV project.

-- 1) Extensions --------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- 2) Enums -------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'request_priority') then
    create type request_priority as enum ('low','medium','high','urgent');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum ('new','in_progress','on_hold','done','cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('trialing','active','past_due','canceled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('open','paid','void','uncollectible');
  end if;
end $$;

-- 3) Helper: admin check (security definer)
-- Moved below profiles table creation to avoid dependency error.

-- 4) Tables ------------------------------------------------------------------
-- 4.1 profiles: mirrors auth.users; created via trigger on signup
create table if not exists public.profiles (
  id uuid primary key,                 -- same as auth.users.id
  email text not null unique,
  name text,
  first_name text,
  last_name text,
  role text not null default 'customer',  -- 'customer' | 'admin'
  plan text,                            -- optional display plan tag
  created_at timestamp with time zone not null default now()
);

-- Add contact/location columns to profiles (idempotent)
alter table public.profiles add column if not exists phone_e164 text;
alter table public.profiles add column if not exists country_code char(2);
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamp with time zone not null default now();

-- Ensure UUID default for profiles.id so inserts without id work
do $$ begin
  perform 1
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and data_type = 'uuid';
  -- If id column exists and is uuid, set default to gen_random_uuid()
  if found then
    execute 'alter table public.profiles alter column id set default gen_random_uuid()';
  end if;
end $$;

-- Map Clerk users to profiles without changing UUID PKs
alter table public.profiles add column if not exists clerk_id text;
create unique index if not exists profiles_clerk_id_key on public.profiles (clerk_id);

-- 4.2 user_sessions: track app-level sessions per user for granular revoke UX
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_key text not null,              -- stable key per device/app install
  label text not null,                    -- e.g. "Web", "Desktop App", "Mobile"
  user_agent text,                        -- optional UA string
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists idx_user_sessions_user_session_key
  on public.user_sessions (user_id, session_key);

alter table public.user_sessions enable row level security;

-- RLS: user can read/insert/update own rows (or admin bypass)
drop policy if exists "sessions_read_own" on public.user_sessions;
create policy "sessions_read_own"
  on public.user_sessions for select
  using ( user_id = auth.uid() or is_admin() );

drop policy if exists "sessions_insert_own" on public.user_sessions;
create policy "sessions_insert_own"
  on public.user_sessions for insert
  with check ( user_id = auth.uid() or is_admin() );

drop policy if exists "sessions_update_own" on public.user_sessions;
create policy "sessions_update_own"
  on public.user_sessions for update
  using ( user_id = auth.uid() or is_admin() )
  with check ( user_id = auth.uid() or is_admin() );

-- Now that profiles exists, create is_admin()
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function is_admin() to anon, authenticated;

-- 4.2 plans: subscription products
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price numeric(10,2) not null default 0,
  quota_hours integer not null default 0,
  features jsonb not null default '{}'::jsonb
);

-- 4.3 subscriptions: customer ↔ plan
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status subscription_status not null default 'trialing',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- 4.4 requests: core work items
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  priority request_priority not null default 'medium',
  status request_status not null default 'new',
  due_date date,
  assignee_id uuid references public.profiles(id) on delete set null, -- VA/admin
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 4.5 request_messages: per-request thread
create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone not null default now()
);

-- 4.6 request_files: metadata only (use Storage for file bytes)
create table if not exists public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  storage_path text not null, -- Supabase Storage path
  filename text not null,
  size bigint not null default 0,
  uploaded_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

-- 4.7 invoices: basic billing records
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  status invoice_status not null default 'open',
  stripe_invoice_id text,
  created_at timestamp with time zone not null default now()
);

-- 4.8 audit_logs: generic audit trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

-- 5) Indexes -----------------------------------------------------------------
create index if not exists idx_requests_customer_status on public.requests (customer_id, status);
create index if not exists idx_requests_assignee on public.requests (assignee_id);
create index if not exists idx_request_messages_request_created on public.request_messages (request_id, created_at desc);
create index if not exists idx_request_files_request on public.request_files (request_id);
create index if not exists idx_subscriptions_customer_status on public.subscriptions (customer_id, status);
create index if not exists idx_invoices_customer_created on public.invoices (customer_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- 6) updated_at trigger on requests -----------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
before update on public.requests
for each row execute function set_updated_at();

-- 7) Profile auto-provision on signup ---------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := null;
  v_last  text := null;
  v_full  text := null;
  v_name  text := null;
begin
  v_first := new.raw_user_meta_data->>'first_name';
  v_last  := new.raw_user_meta_data->>'last_name';
  v_full  := new.raw_user_meta_data->>'full_name';
  v_name  := coalesce(v_full, nullif(trim(concat_ws(' ', v_first, v_last)), ''), split_part(new.email,'@',1));

  insert into public.profiles (id, email, name, first_name, last_name, role)
  values (
    new.id,
    new.email,
    v_name,
    nullif(v_first, ''),
    nullif(v_last, ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 8) RLS & policies ----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.request_files enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select using ( id = auth.uid() or is_admin() );
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update using ( id = auth.uid() or is_admin() );

-- PLANS (public read; admin manage)
drop policy if exists "plans_read_everyone" on public.plans;
create policy "plans_read_everyone"
  on public.plans for select using ( true );
drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write"
  on public.plans for all using ( is_admin() ) with check ( is_admin() );

-- SUBSCRIPTIONS
drop policy if exists "subscriptions_select_owner_or_admin" on public.subscriptions;
create policy "subscriptions_select_owner_or_admin"
  on public.subscriptions for select using ( customer_id = auth.uid() or is_admin() );
drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write"
  on public.subscriptions for all using ( is_admin() ) with check ( is_admin() );

-- REQUESTS
drop policy if exists "requests_select_owner_or_assignee_or_admin" on public.requests;
create policy "requests_select_owner_or_assignee_or_admin"
  on public.requests for select using (
    customer_id = auth.uid() or assignee_id = auth.uid() or is_admin()
  );
drop policy if exists "requests_insert_owner_or_admin" on public.requests;
create policy "requests_insert_owner_or_admin"
  on public.requests for insert with check ( customer_id = auth.uid() or is_admin() );
drop policy if exists "requests_update_owner_assignee_admin" on public.requests;
create policy "requests_update_owner_assignee_admin"
  on public.requests for update using (
    customer_id = auth.uid() or assignee_id = auth.uid() or is_admin()
  );

-- REQUEST_MESSAGES
drop policy if exists "messages_select_if_request_visible" on public.request_messages;
create policy "messages_select_if_request_visible"
  on public.request_messages for select using (
    exists (
      select 1 from public.requests r
      where r.id = request_messages.request_id
        and (r.customer_id = auth.uid() or r.assignee_id = auth.uid() or is_admin())
    )
  );
drop policy if exists "messages_insert_if_request_visible" on public.request_messages;
create policy "messages_insert_if_request_visible"
  on public.request_messages for insert with check (
    exists (
      select 1 from public.requests r
      where r.id = request_messages.request_id
        and (r.customer_id = auth.uid() or r.assignee_id = auth.uid() or is_admin())
    )
  );

-- REQUEST_FILES
drop policy if exists "files_select_if_request_visible" on public.request_files;
create policy "files_select_if_request_visible"
  on public.request_files for select using (
    exists (
      select 1 from public.requests r
      where r.id = request_files.request_id
        and (r.customer_id = auth.uid() or r.assignee_id = auth.uid() or is_admin())
    )
  );
drop policy if exists "files_insert_if_request_visible" on public.request_files;
create policy "files_insert_if_request_visible"
  on public.request_files for insert with check (
    exists (
      select 1 from public.requests r
      where r.id = request_files.request_id
        and (r.customer_id = auth.uid() or r.assignee_id = auth.uid() or is_admin())
    )
  );

-- INVOICES
drop policy if exists "invoices_select_owner_or_admin" on public.invoices;
create policy "invoices_select_owner_or_admin"
  on public.invoices for select using ( customer_id = auth.uid() or is_admin() );
drop policy if exists "invoices_admin_write" on public.invoices;
create policy "invoices_admin_write"
  on public.invoices for all using ( is_admin() ) with check ( is_admin() );

-- AUDIT_LOGS
drop policy if exists "audit_logs_select_actor_or_admin" on public.audit_logs;
create policy "audit_logs_select_actor_or_admin"
  on public.audit_logs for select using ( actor_id = auth.uid() or is_admin() );
drop policy if exists "audit_logs_admin_write" on public.audit_logs;
create policy "audit_logs_admin_write"
  on public.audit_logs for all using ( is_admin() ) with check ( is_admin() );

-- 9) Optional: create a private Storage bucket for files ---------------------
-- select storage.create_bucket('request-files', false);

-- 10) Optional: promote your user to admin ----------------------------------
-- update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
