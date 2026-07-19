create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role' and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('admin', 'ceo', 'payroll_manager', 'engineer', 'employee');
  end if;
end
$$;

alter type public.app_role add value if not exists 'admin';
alter type public.app_role add value if not exists 'ceo';
alter type public.app_role add value if not exists 'payroll_manager';
alter type public.app_role add value if not exists 'engineer';
alter type public.app_role add value if not exists 'employee';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payroll_run_status' and n.nspname = 'public'
  ) then
    create type public.payroll_run_status as enum ('draft', 'submitted', 'approved', 'rejected');
  end if;
end
$$;

alter type public.payroll_run_status add value if not exists 'draft';
alter type public.payroll_run_status add value if not exists 'submitted';
alter type public.payroll_run_status add value if not exists 'approved';
alter type public.payroll_run_status add value if not exists 'rejected';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'adjustment_status' and n.nspname = 'public'
  ) then
    create type public.adjustment_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

alter type public.adjustment_status add value if not exists 'pending';
alter type public.adjustment_status add value if not exists 'approved';
alter type public.adjustment_status add value if not exists 'rejected';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'adjustment_type' and n.nspname = 'public'
  ) then
    create type public.adjustment_type as enum ('overtime', 'paid_holiday', 'cash_advance', 'paid_leave');
  end if;
end
$$;

alter type public.adjustment_type add value if not exists 'overtime';
alter type public.adjustment_type add value if not exists 'paid_holiday';
alter type public.adjustment_type add value if not exists 'cash_advance';
alter type public.adjustment_type add value if not exists 'paid_leave';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  full_name text,
  avatar_path text,
  role public.app_role not null default 'payroll_manager',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop column if exists avatar_url;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  full_name text not null,
  default_role_code text,
  site_id uuid references public.sites(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_imports (
  id uuid primary key default gen_random_uuid(),
  original_filename text not null,
  site_id uuid references public.sites(id) on delete set null,
  site_name text not null,
  period_label text not null,
  period_start date,
  period_end date,
  storage_path text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  raw_rows integer not null default 0,
  removed_entries integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.attendance_imports(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  log_date date not null,
  log_time time not null,
  log_type text not null check (log_type in ('IN', 'OUT')),
  log_source text not null check (log_source in ('Time1', 'Time2', 'OT')),
  site_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_rates (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  daily_rate numeric(12,2) not null check (daily_rate >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_branch_rates (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  employee_name_key text not null,
  role_code text not null,
  site_name text not null,
  site_name_key text not null,
  daily_rate numeric(12,2) not null check (daily_rate >= 0),
  regular_paid_hours numeric(8,2) not null default 8 check (regular_paid_hours > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.employee_branch_rates
  add column if not exists regular_paid_hours numeric(8,2) not null default 8;

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  attendance_import_id uuid references public.attendance_imports(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  site_name text not null,
  period_label text not null,
  period_start date,
  period_end date,
  status public.payroll_run_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  submitted_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  gross_total numeric(14,2) not null default 0,
  net_total numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  role_code text not null,
  site_name text not null,
  days_worked numeric(8,2) not null default 0,
  hours_worked numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  rate_per_day numeric(12,2) not null default 0,
  regular_pay numeric(14,2) not null default 0,
  overtime_pay numeric(14,2) not null default 0,
  holiday_pay numeric(14,2) not null default 0,
  deductions_total numeric(14,2) not null default 0,
  total_pay numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_run_daily_totals (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  payroll_run_item_id uuid references public.payroll_run_items(id) on delete cascade,
  attendance_import_id uuid references public.attendance_imports(id) on delete set null,
  employee_name text not null,
  role_code text not null,
  site_name text not null,
  payout_date date not null,
  hours_worked numeric(10,2) not null default 0,
  total_pay numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references public.payroll_runs(id) on delete cascade,
  payroll_run_item_id uuid references public.payroll_run_items(id) on delete cascade,
  attendance_import_id uuid references public.attendance_imports(id) on delete cascade,
  employee_name text,
  employee_name_key text,
  role_code text,
  site_name text,
  site_name_key text,
  period_label text,
  period_start date,
  period_end date,
  adjustment_type public.adjustment_type not null,
  status public.adjustment_status not null default 'pending',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  effective_date date,
  quantity numeric(10,2) not null default 0,
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  requester_role public.app_role not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  payroll_adjustment_id uuid references public.payroll_adjustments(id) on delete set null,
  employee_name text not null,
  role_code text,
  site_name text not null,
  period_label text,
  request_date date not null,
  overtime_hours numeric(10,2) not null default 0,
  amount numeric(14,2) not null default 0,
  reason text,
  approval_mode text not null default 'manual' check (approval_mode in ('manual', 'auto_on_date')),
  status public.adjustment_status not null default 'pending',
  approved_at timestamptz,
  auto_approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.payroll_adjustments alter column payroll_run_id drop not null;
alter table public.payroll_adjustments add column if not exists attendance_import_id uuid references public.attendance_imports(id) on delete cascade;
alter table public.payroll_adjustments add column if not exists employee_name text;
alter table public.payroll_adjustments add column if not exists employee_name_key text;
alter table public.payroll_adjustments add column if not exists role_code text;
alter table public.payroll_adjustments add column if not exists site_name text;
alter table public.payroll_adjustments add column if not exists site_name_key text;
alter table public.payroll_adjustments add column if not exists period_label text;
alter table public.payroll_adjustments add column if not exists period_start date;
alter table public.payroll_adjustments add column if not exists period_end date;
alter table public.payroll_adjustments add column if not exists source_overtime_request_id uuid references public.overtime_requests(id) on delete set null;
alter table public.overtime_requests add column if not exists payroll_adjustment_id uuid references public.payroll_adjustments(id) on delete set null;
alter table public.overtime_requests add column if not exists role_code text;
alter table public.overtime_requests add column if not exists approval_mode text not null default 'manual';
alter table public.overtime_requests add column if not exists auto_approved_at timestamptz;
alter table public.overtime_requests drop constraint if exists overtime_requests_approval_mode_check;
alter table public.overtime_requests add constraint overtime_requests_approval_mode_check check (approval_mode in ('manual', 'auto_on_date'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists attendance_imports_period_idx on public.attendance_imports(period_start, period_end);
create index if not exists attendance_imports_site_name_idx on public.attendance_imports(site_name);
create index if not exists attendance_records_import_id_idx on public.attendance_records(import_id);
create index if not exists attendance_records_log_date_idx on public.attendance_records(log_date);
create index if not exists payroll_runs_status_idx on public.payroll_runs(status);
create index if not exists payroll_runs_period_idx on public.payroll_runs(period_start, period_end);
create unique index if not exists employee_branch_rates_lookup_idx on public.employee_branch_rates(employee_name_key, role_code, site_name_key);
create index if not exists payroll_run_items_payroll_run_id_idx on public.payroll_run_items(payroll_run_id);
create index if not exists payroll_run_daily_totals_payroll_run_id_idx on public.payroll_run_daily_totals(payroll_run_id);
create index if not exists payroll_run_daily_totals_payout_date_idx on public.payroll_run_daily_totals(payout_date);
create unique index if not exists payroll_run_daily_totals_item_date_idx on public.payroll_run_daily_totals(payroll_run_item_id, payout_date);
create index if not exists payroll_adjustments_payroll_run_id_idx on public.payroll_adjustments(payroll_run_id);
create index if not exists payroll_adjustments_status_idx on public.payroll_adjustments(status);
create index if not exists payroll_adjustments_attendance_import_id_idx on public.payroll_adjustments(attendance_import_id);
create index if not exists payroll_adjustments_lookup_idx on public.payroll_adjustments(adjustment_type, status, employee_name_key, role_code, site_name_key, period_label);
create unique index if not exists payroll_adjustments_source_overtime_request_id_idx on public.payroll_adjustments(source_overtime_request_id) where source_overtime_request_id is not null;
create index if not exists overtime_requests_status_idx on public.overtime_requests(status);
create index if not exists overtime_requests_requested_by_idx on public.overtime_requests(requested_by);
create index if not exists overtime_requests_request_date_idx on public.overtime_requests(request_date);
create index if not exists overtime_requests_auto_lookup_idx on public.overtime_requests(approval_mode, status, request_date, period_label);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();

drop trigger if exists role_rates_set_updated_at on public.role_rates;
create trigger role_rates_set_updated_at before update on public.role_rates for each row execute function public.set_updated_at();

drop trigger if exists employee_branch_rates_set_updated_at on public.employee_branch_rates;
create trigger employee_branch_rates_set_updated_at before update on public.employee_branch_rates for each row execute function public.set_updated_at();

drop trigger if exists payroll_runs_set_updated_at on public.payroll_runs;
create trigger payroll_runs_set_updated_at before update on public.payroll_runs for each row execute function public.set_updated_at();

drop trigger if exists payroll_adjustments_set_updated_at on public.payroll_adjustments;
create trigger payroll_adjustments_set_updated_at before update on public.payroll_adjustments for each row execute function public.set_updated_at();

drop trigger if exists overtime_requests_set_updated_at on public.overtime_requests;
create trigger overtime_requests_set_updated_at before update on public.overtime_requests for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_imports enable row level security;
alter table public.attendance_records enable row level security;
alter table public.role_rates enable row level security;
alter table public.employee_branch_rates enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_run_items enable row level security;
alter table public.payroll_run_daily_totals enable row level security;
alter table public.payroll_adjustments enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ceo'::public.app_role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'admin'
  )
$$;

create or replace function public.is_payroll_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'payroll_manager'::public.app_role
  )
$$;

create or replace function public.is_engineer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'engineer'::public.app_role
  )
$$;

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'employee'
  )
$$;

drop policy if exists "profiles select own or ceo" on public.profiles;
drop policy if exists "profiles update own or ceo" on public.profiles;
drop policy if exists "profiles select own or ceo admin" on public.profiles;
drop policy if exists "profiles update own or ceo admin" on public.profiles;
drop policy if exists "sites readable by authenticated users" on public.sites;
drop policy if exists "sites managed by ceo" on public.sites;
drop policy if exists "sites managed by payroll managers and ceo" on public.sites;
drop policy if exists "employees readable by authenticated users" on public.employees;
drop policy if exists "employees managed by payroll managers and ceo" on public.employees;
drop policy if exists "attendance imports readable by authenticated users" on public.attendance_imports;
drop policy if exists "attendance imports inserted by payroll managers and ceo" on public.attendance_imports;
drop policy if exists "attendance imports updated by payroll managers and ceo" on public.attendance_imports;
drop policy if exists "attendance records readable by authenticated users" on public.attendance_records;
drop policy if exists "attendance records inserted by payroll managers and ceo" on public.attendance_records;
drop policy if exists "attendance records updated by payroll managers and ceo" on public.attendance_records;
drop policy if exists "role rates readable by authenticated users" on public.role_rates;
drop policy if exists "role rates managed by ceo" on public.role_rates;
drop policy if exists "employee branch rates readable by authenticated users" on public.employee_branch_rates;
drop policy if exists "employee branch rates managed by payroll managers and ceo" on public.employee_branch_rates;
drop policy if exists "payroll runs readable by authenticated users" on public.payroll_runs;
drop policy if exists "payroll runs inserted by payroll managers and ceo" on public.payroll_runs;
drop policy if exists "payroll runs updated by payroll managers and ceo" on public.payroll_runs;
drop policy if exists "payroll run items readable by authenticated users" on public.payroll_run_items;
drop policy if exists "payroll run items inserted by payroll managers and ceo" on public.payroll_run_items;
drop policy if exists "payroll run items updated by payroll managers and ceo" on public.payroll_run_items;
drop policy if exists "payroll run daily totals readable by authenticated users" on public.payroll_run_daily_totals;
drop policy if exists "payroll run daily totals inserted by payroll managers and ceo" on public.payroll_run_daily_totals;
drop policy if exists "payroll run daily totals updated by payroll managers and ceo" on public.payroll_run_daily_totals;
drop policy if exists "payroll adjustments readable by authenticated users" on public.payroll_adjustments;
drop policy if exists "payroll adjustments inserted by payroll managers and ceo" on public.payroll_adjustments;
drop policy if exists "payroll adjustments updated by payroll managers and ceo" on public.payroll_adjustments;
drop policy if exists "overtime requests readable by authenticated users" on public.overtime_requests;
drop policy if exists "overtime requests inserted by payroll engineer employee" on public.overtime_requests;
drop policy if exists "overtime requests updated by ceo" on public.overtime_requests;
drop policy if exists "audit logs readable by ceo" on public.audit_logs;
drop policy if exists "audit logs inserted by payroll managers and ceo" on public.audit_logs;
drop policy if exists "profile avatars are publicly readable" on storage.objects;
drop policy if exists "users can upload their own profile avatar" on storage.objects;
drop policy if exists "users can update their own profile avatar" on storage.objects;
drop policy if exists "users can delete their own profile avatar" on storage.objects;

create policy "profiles select own or ceo admin" on public.profiles for select using (auth.uid() = id or public.is_ceo() or public.is_admin());
create policy "profiles update own or ceo admin" on public.profiles for update using (auth.uid() = id or public.is_ceo() or public.is_admin()) with check (auth.uid() = id or public.is_ceo() or public.is_admin());
create policy "sites readable by authenticated users" on public.sites for select using (auth.role() = 'authenticated');
create policy "sites managed by payroll managers and ceo" on public.sites for all using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "employees readable by authenticated users" on public.employees for select using (auth.role() = 'authenticated');
create policy "employees managed by payroll managers and ceo" on public.employees for all using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "attendance imports readable by authenticated users" on public.attendance_imports for select using (auth.role() = 'authenticated');
create policy "attendance imports inserted by payroll managers and ceo" on public.attendance_imports for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "attendance imports updated by payroll managers and ceo" on public.attendance_imports for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "attendance records readable by authenticated users" on public.attendance_records for select using (auth.role() = 'authenticated');
create policy "attendance records inserted by payroll managers and ceo" on public.attendance_records for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "attendance records updated by payroll managers and ceo" on public.attendance_records for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "role rates readable by authenticated users" on public.role_rates for select using (auth.role() = 'authenticated');
create policy "role rates managed by ceo" on public.role_rates for all using (public.is_ceo()) with check (public.is_ceo());
create policy "employee branch rates readable by authenticated users" on public.employee_branch_rates for select using (auth.role() = 'authenticated');
create policy "employee branch rates managed by payroll managers and ceo" on public.employee_branch_rates for all using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll runs readable by authenticated users" on public.payroll_runs for select using (auth.role() = 'authenticated');
create policy "payroll runs inserted by payroll managers and ceo" on public.payroll_runs for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll runs updated by payroll managers and ceo" on public.payroll_runs for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll run items readable by authenticated users" on public.payroll_run_items for select using (auth.role() = 'authenticated');
create policy "payroll run items inserted by payroll managers and ceo" on public.payroll_run_items for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll run items updated by payroll managers and ceo" on public.payroll_run_items for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll run daily totals readable by authenticated users" on public.payroll_run_daily_totals for select using (auth.role() = 'authenticated');
create policy "payroll run daily totals inserted by payroll managers and ceo" on public.payroll_run_daily_totals for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll run daily totals updated by payroll managers and ceo" on public.payroll_run_daily_totals for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll adjustments readable by authenticated users" on public.payroll_adjustments for select using (auth.role() = 'authenticated');
create policy "payroll adjustments inserted by payroll managers and ceo" on public.payroll_adjustments for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "payroll adjustments updated by payroll managers and ceo" on public.payroll_adjustments for update using (public.is_ceo() or public.is_payroll_manager()) with check (public.is_ceo() or public.is_payroll_manager());
create policy "overtime requests readable by authenticated users" on public.overtime_requests for select using (auth.role() = 'authenticated');
create policy "overtime requests inserted by payroll engineer employee" on public.overtime_requests for insert with check (public.is_payroll_manager() or public.is_engineer() or public.is_employee());
create policy "overtime requests updated by ceo" on public.overtime_requests for update using (public.is_ceo()) with check (public.is_ceo());
create policy "audit logs readable by ceo" on public.audit_logs for select using (public.is_ceo());
create policy "audit logs inserted by payroll managers and ceo" on public.audit_logs for insert with check (public.is_ceo() or public.is_payroll_manager());
create policy "profile avatars are publicly readable" on storage.objects for select using (bucket_id = 'profile-avatars');
create policy "users can upload their own profile avatar" on storage.objects for insert to authenticated with check (bucket_id = 'profile-avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can update their own profile avatar" on storage.objects for update to authenticated using (bucket_id = 'profile-avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can delete their own profile avatar" on storage.objects for delete to authenticated using (bucket_id = 'profile-avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
