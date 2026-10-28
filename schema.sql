-- ILAD Construction Panel Control: full schema (v3)
-- Run once, in a fresh Supabase project: SQL Editor > New query > paste > Run.
-- Open sign-up is allowed: new users start as 'pending' and see nothing
-- until an admin approves them.

-- 1. Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'pending' check (role in ('admin', 'site_lead', 'pending')),
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  site_lead_id uuid references public.profiles(id),
  active boolean not null default true
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  active boolean not null default true
);

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  log_date date not null,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (site_id, log_date)
);

create table public.log_attendance (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  unique (daily_log_id, worker_id)
);

create table public.log_work_items (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  plot text not null,
  lift text,
  description text not null,
  is_extra boolean not null default false
);

create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  week_start date not null,
  title text not null,
  done boolean not null default false,
  done_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  contractor_name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  created_at timestamptz not null default now()
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  work_item_id uuid references public.log_work_items(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(10,2) check (unit_price is null or unit_price >= 0)
);

-- 2. Helper functions
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'site_lead')
  );
$$;

create or replace function public.is_site_lead_of(p_site uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sites where id = p_site and site_lead_id = auth.uid()
  );
$$;

-- 3. Auto-create a 'pending' profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
    'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Ticking a goal: site leads (and admin) can change only done / done_by
create or replace function public.set_goal_done(p_goal uuid, p_done boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.weekly_goals g
    where g.id = p_goal
      and (public.is_admin() or public.is_site_lead_of(g.site_id))
  ) then
    raise exception 'Not allowed';
  end if;

  update public.weekly_goals
  set done = p_done,
      done_by = case when p_done then auth.uid() else null end
  where id = p_goal;
end;
$$;

-- 5. Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.workers enable row level security;
alter table public.daily_logs enable row level security;
alter table public.log_attendance enable row level security;
alter table public.log_work_items enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

-- 6. Policies
-- profiles: users read their own profile, approved users read names
-- (to show "entered by"), only admin changes roles. Nobody edits their own role.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_select_approved on public.profiles
  for select using (public.is_approved());
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- sites: admin manages, site lead reads own sites
create policy sites_select on public.sites
  for select using (public.is_admin() or site_lead_id = auth.uid());
create policy sites_admin_write on public.sites
  for all using (public.is_admin()) with check (public.is_admin());

-- workers: approved users read, admin manages
create policy workers_select on public.workers
  for select using (public.is_approved());
create policy workers_admin_write on public.workers
  for all using (public.is_admin()) with check (public.is_admin());

-- daily_logs: admin all, site lead only own sites, pending users nothing
create policy daily_logs_access on public.daily_logs
  for all
  using (public.is_admin() or public.is_site_lead_of(site_id))
  with check (public.is_admin() or public.is_site_lead_of(site_id));

-- attendance and work items: allowed only if the parent log is visible to the caller
create policy log_attendance_access on public.log_attendance
  for all
  using (exists (select 1 from public.daily_logs d where d.id = daily_log_id))
  with check (exists (select 1 from public.daily_logs d where d.id = daily_log_id));

create policy log_work_items_access on public.log_work_items
  for all
  using (exists (select 1 from public.daily_logs d where d.id = daily_log_id))
  with check (exists (select 1 from public.daily_logs d where d.id = daily_log_id));

-- weekly goals: admin manages, site leads read goals of their own sites
create policy weekly_goals_admin on public.weekly_goals
  for all using (public.is_admin()) with check (public.is_admin());
create policy weekly_goals_lead_select on public.weekly_goals
  for select using (public.is_site_lead_of(site_id));

-- invoices: admin only
create policy invoices_admin on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());
create policy invoice_lines_admin on public.invoice_lines
  for all using (public.is_admin()) with check (public.is_admin());

-- 7. Weekly report views (respect the caller's RLS)
create view public.weekly_hours
with (security_invoker = true) as
select
  date_trunc('week', d.log_date)::date as week_start,
  s.name as site,
  w.full_name as worker,
  sum(a.hours) as total_hours
from public.log_attendance a
join public.daily_logs d on d.id = a.daily_log_id
join public.sites s on s.id = d.site_id
join public.workers w on w.id = a.worker_id
group by 1, 2, 3;

create view public.weekly_work
with (security_invoker = true) as
select
  date_trunc('week', d.log_date)::date as week_start,
  d.log_date,
  s.name as site,
  i.plot,
  i.lift,
  i.description,
  i.is_extra
from public.log_work_items i
join public.daily_logs d on d.id = i.daily_log_id
join public.sites s on s.id = d.site_id;
