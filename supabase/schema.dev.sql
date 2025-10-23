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
alter table public.profiles add column if not exists display_name text;

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

-- 5.x VA assignments: map customers -> primary/secondary VAs (primary is a VA)
create table if not exists public.va_assignments (
  id uuid primary key default gen_random_uuid(),

  -- customer who receives VA support
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,

  -- primary VA (must be role 'va' in app layer)
  primary_va_profile_id uuid not null references public.profiles(id) on delete restrict,

  -- secondary VA (optional)
  secondary_va_profile_id uuid references public.profiles(id) on delete set null,

  -- audit
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,

  active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one ACTIVE assignment per customer
create unique index if not exists uq_va_assignments_customer_active
  on public.va_assignments (customer_profile_id)
  where (active is true);

-- Lookups for VA dashboards
create index if not exists idx_va_assignments_primary_va
  on public.va_assignments (primary_va_profile_id)
  where (active is true);

create index if not exists idx_va_assignments_secondary_va
  on public.va_assignments (secondary_va_profile_id)
  where (active is true);

create index if not exists idx_va_assignments_customer
  on public.va_assignments (customer_profile_id);

alter table public.va_assignments enable row level security;

-- Placeholder RLS (server uses Service Role; lock writes from clients)
drop policy if exists "va_assignments_read_all_server_only" on public.va_assignments;
create policy "va_assignments_read_all_server_only" on public.va_assignments for select using (true);

drop policy if exists "va_assignments_write_none_client" on public.va_assignments;
create policy "va_assignments_write_none_client" on public.va_assignments for all using (false) with check (false);
  on public.user_sessions for select
  using ( user_id = auth.uid() or is_admin() );

-- RPC: get_customer_assignment(clerk_id)
drop function if exists public.get_customer_assignment(text);
create or replace function public.get_customer_assignment(p_clerk_id text)
returns table (
  primary_va_id uuid,
  primary_email text,
  primary_display_name text,
  primary_name text,
  primary_best_name text,
  primary_phone text,
  primary_country char(2),
  primary_region text,
  secondary_va_id uuid,
  secondary_email text,
  secondary_display_name text,
  secondary_name text,
  secondary_best_name text,
  secondary_phone text,
  secondary_country char(2),
  secondary_region text
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id from public.profiles where clerk_id = p_clerk_id
  ), a as (
    select primary_va_profile_id, secondary_va_profile_id
    from public.va_assignments
    where customer_profile_id = (select id from me)
      and active = true
    limit 1
  )
  select
    p1.id as primary_va_id,
    p1.email as primary_email,
    p1.display_name as primary_display_name,
    p1.name as primary_name,
    coalesce(
      nullif(p1.display_name, ''),
      nullif(p1.name, ''),
      nullif(trim(concat_ws(' ', p1.first_name, p1.last_name)), ''),
      split_part(p1.email, '@', 1)
    ) as primary_best_name,
    p1.phone_e164 as primary_phone,
    p1.country_code as primary_country,
    p1.region as primary_region,
    p2.id as secondary_va_id,
    p2.email as secondary_email,
    p2.display_name as secondary_display_name,
    p2.name as secondary_name,
    coalesce(
      nullif(p2.display_name, ''),
      nullif(p2.name, ''),
      nullif(trim(concat_ws(' ', p2.first_name, p2.last_name)), ''),
      split_part(p2.email, '@', 1)
    ) as secondary_best_name,
    p2.phone_e164 as secondary_phone,
    p2.country_code as secondary_country,
    p2.region as secondary_region
  from a
  left join public.profiles p1 on p1.id = a.primary_va_profile_id
  left join public.profiles p2 on p2.id = a.secondary_va_profile_id;
$$;

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

-- 8.x) VA reporting: map VA -> team lead/manager (for CC emails) ------------
create table if not exists public.va_reporting (
  va_profile_id uuid primary key references public.profiles(id) on delete cascade,
  team_lead_profile_id uuid references public.profiles(id) on delete set null,
  manager_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.va_reporting enable row level security;

drop policy if exists "va_reporting_read_all" on public.va_reporting;
create policy "va_reporting_read_all"
  on public.va_reporting for select using ( true );

drop policy if exists "va_reporting_write_server_only" on public.va_reporting;
create policy "va_reporting_write_server_only"
  on public.va_reporting for all using ( false ) with check ( false );

-- 8.y) Assistant messages ----------------------------------------------------
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  va_id uuid not null references public.profiles(id) on delete set null,
  subject text,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chk_assistant_messages_body_len check (length(body) <= 1000),
  constraint chk_assistant_messages_subject_len check (subject is null or length(subject) <= 120)
);

create index if not exists idx_assistant_messages_customer_created on public.assistant_messages (customer_id, created_at desc);

alter table public.assistant_messages enable row level security;

drop policy if exists "assistant_messages_select_owner_or_admin" on public.assistant_messages;
create policy "assistant_messages_select_owner_or_admin"
  on public.assistant_messages for select using ( customer_id = auth.uid() or is_admin() );

drop policy if exists "assistant_messages_write_server_only" on public.assistant_messages;
create policy "assistant_messages_write_server_only"
  on public.assistant_messages for all using ( false ) with check ( false );

-- 8.z) Tasks (lightweight, to surface on Tasks page) -------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  assignee_va_id uuid not null references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint chk_tasks_title_len check (length(title) <= 120),
  constraint chk_tasks_desc_len check (description is null or length(description) <= 4000)
);

create index if not exists idx_tasks_customer_status on public.tasks (customer_id, status);
create index if not exists idx_tasks_assignee on public.tasks (assignee_va_id);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_owner_or_assignee_or_admin" on public.tasks;
create policy "tasks_select_owner_or_assignee_or_admin"
  on public.tasks for select using ( customer_id = auth.uid() or assignee_va_id = auth.uid() or is_admin() );

drop policy if exists "tasks_write_server_only" on public.tasks;
create policy "tasks_write_server_only"
  on public.tasks for all using ( false ) with check ( false );

-- 8.z.1) Extend tasks: time allocation and scheduling ------------------------
do $$ begin
  -- estimated_time_minutes
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'estimated_time_minutes'
  ) then
    alter table public.tasks add column estimated_time_minutes int;
  end if;

  -- scheduled_start_at / scheduled_end_at
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'scheduled_start_at'
  ) then
    alter table public.tasks add column scheduled_start_at timestamptz null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'scheduled_end_at'
  ) then
    alter table public.tasks add column scheduled_end_at timestamptz null;
  end if;

  -- priority (optional)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'priority'
  ) then
    alter table public.tasks add column priority text default 'normal';
  end if;
end $$;

-- Constraints (idempotent patterns)
do $$ begin
  begin
    alter table public.tasks add constraint chk_tasks_estimated_time
      check (estimated_time_minutes is null or (estimated_time_minutes > 0 and estimated_time_minutes <= 480));
  exception when duplicate_object then null; end;

  begin
    alter table public.tasks add constraint chk_tasks_schedule_order
      check (scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at >= scheduled_start_at);
  exception when duplicate_object then null; end;
end $$;

create index if not exists idx_tasks_scheduled_start on public.tasks (scheduled_start_at);

-- 8.z.2) Task work logs ------------------------------------------------------
create table if not exists public.task_work_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  va_id uuid not null references public.profiles(id) on delete set null,
  action text not null,
  at timestamptz not null default now(),
  note text,
  constraint chk_twl_action check (action in ('start','pause','resume','complete')),
  constraint chk_twl_note_len check (note is null or length(note) <= 1000)
);

create index if not exists idx_twl_task_at on public.task_work_logs (task_id, at asc);
create index if not exists idx_twl_va_at on public.task_work_logs (va_id, at desc);

alter table public.task_work_logs enable row level security;

drop policy if exists "twl_select_owner_va_admin" on public.task_work_logs;
create policy "twl_select_owner_va_admin"
  on public.task_work_logs for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.customer_id = auth.uid() or t.assignee_va_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "twl_write_server_only" on public.task_work_logs;
create policy "twl_write_server_only"
  on public.task_work_logs for all using ( false ) with check ( false );

-- 8.z.3) Customer plans ------------------------------------------------------
create table if not exists public.customer_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  status text not null default 'active'
);

create index if not exists idx_customer_plans_customer on public.customer_plans (customer_id, status);

alter table public.customer_plans enable row level security;

drop policy if exists "customer_plans_select_owner_admin" on public.customer_plans;
create policy "customer_plans_select_owner_admin"
  on public.customer_plans for select using ( customer_id = auth.uid() or is_admin() );

drop policy if exists "customer_plans_write_server_only" on public.customer_plans;
create policy "customer_plans_write_server_only"
  on public.customer_plans for all using ( false ) with check ( false );

-- 8.aa) Change Assistant requests -------------------------------------------
create table if not exists public.assistant_change_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  current_va_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint chk_change_reason_len check (length(reason) <= 64),
  constraint chk_change_details_len check (details is null or length(details) <= 2000)
);

create index if not exists idx_change_requests_customer_created on public.assistant_change_requests (customer_id, created_at desc);

alter table public.assistant_change_requests enable row level security;

drop policy if exists "change_requests_select_owner_or_admin" on public.assistant_change_requests;
create policy "change_requests_select_owner_or_admin"
  on public.assistant_change_requests for select using ( customer_id = auth.uid() or is_admin() );

drop policy if exists "change_requests_write_server_only" on public.assistant_change_requests;
create policy "change_requests_write_server_only"
  on public.assistant_change_requests for all using ( false ) with check ( false );

-- 8.ab) Escalations ----------------------------------------------------------
create table if not exists public.assistant_escalations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  va_id uuid references public.profiles(id) on delete set null,
  severity text not null,
  subject text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint chk_escalation_severity_len check (length(severity) <= 16),
  constraint chk_escalation_subject_len check (length(subject) <= 120),
  constraint chk_escalation_details_len check (details is null or length(details) <= 4000)
);

create index if not exists idx_escalations_customer_created on public.assistant_escalations (customer_id, created_at desc);

alter table public.assistant_escalations enable row level security;

drop policy if exists "escalations_select_owner_or_admin" on public.assistant_escalations;
create policy "escalations_select_owner_or_admin"
  on public.assistant_escalations for select using ( customer_id = auth.uid() or is_admin() );

drop policy if exists "escalations_write_server_only" on public.assistant_escalations;
create policy "escalations_write_server_only"
  on public.assistant_escalations for all using ( false ) with check ( false );

-- 8.ac) Recipient resolution RPC --------------------------------------------
create or replace function public.resolve_va_recipients(p_clerk_id text)
returns table (
  customer_id uuid,
  va_id uuid,
  va_email text,
  team_lead_email text,
  manager_email text
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id from public.profiles where clerk_id = p_clerk_id
  ), a as (
    select primary_va_profile_id as va_id
    from public.va_assignments
    where customer_profile_id = (select id from me)
      and active = true
    limit 1
  ), vr as (
    select team_lead_profile_id, manager_profile_id
    from public.va_reporting
    where va_profile_id = (select va_id from a)
  )
  select
    (select id from me) as customer_id,
    (select va_id from a) as va_id,
    pva.email as va_email,
    ptl.email as team_lead_email,
    pm.email as manager_email
  from public.profiles pva
  left join public.profiles ptl on ptl.id = (select team_lead_profile_id from vr)
  left join public.profiles pm  on pm.id  = (select manager_profile_id from vr)
  where pva.id = (select va_id from a);
$$;

grant execute on function public.resolve_va_recipients(text) to anon, authenticated;

-- 8.ad) Orders (for plan purchases via Razorpay) -----------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  razorpay_order_id text not null unique,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'pending', -- pending | paid | failed | refunded
  created_at timestamptz not null default now(),
  paid_at timestamptz null,
  raw jsonb null
);

create index if not exists idx_orders_customer_created on public.orders (customer_id, created_at desc);
create index if not exists idx_orders_rzpid on public.orders (razorpay_order_id);

alter table public.orders enable row level security;

drop policy if exists "orders_select_owner_admin" on public.orders;
create policy "orders_select_owner_admin"
  on public.orders for select using ( customer_id = auth.uid() or is_admin() );

drop policy if exists "orders_write_server_only" on public.orders;
create policy "orders_write_server_only"
  on public.orders for all using ( false ) with check ( false );

-- 9) Optional: create a private Storage bucket for files ---------------------
-- select storage.create_bucket('request-files', false);

-- 10) Optional: promote your user to admin ----------------------------------
-- update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
