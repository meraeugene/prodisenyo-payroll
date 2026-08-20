begin;

alter table public.payroll_runs
  add column if not exists locked_at timestamptz,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references public.profiles(id) on delete set null,
  add column if not exists reopen_reason text;

create table if not exists public.employee_work_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  employee_name_key text,
  site_id uuid references public.sites(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_workday boolean not null default true,
  standard_seconds integer not null default 28800 check (standard_seconds >= 0),
  break_seconds integer not null default 3600 check (break_seconds >= 0),
  effective_from date,
  effective_to date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (employee_id is not null or employee_name_key is not null)
);

create table if not exists public.payroll_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  holiday_type text not null check (
    holiday_type in ('regular', 'special_non_working', 'local', 'company')
  ),
  site_id uuid references public.sites(id) on delete cascade,
  payable_seconds integer not null default 28800 check (payable_seconds >= 0),
  multiplier_basis_points integer not null default 10000 check (multiplier_basis_points >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_leave_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  employee_name_key text,
  leave_date date not null,
  leave_type text not null check (leave_type in ('paid', 'sick', 'unpaid')),
  status public.adjustment_status not null default 'pending',
  payable_seconds integer not null default 0 check (payable_seconds >= 0),
  reason text,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (employee_id is not null or employee_name_key is not null)
);

create table if not exists public.payroll_attendance_days (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references public.payroll_runs(id) on delete cascade,
  payroll_run_item_id uuid references public.payroll_run_items(id) on delete cascade,
  attendance_import_id uuid references public.attendance_imports(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  employee_name_key text not null,
  role_code text not null,
  site_name text not null,
  attendance_date date not null,
  schedule_type text not null default 'missing' check (
    schedule_type in ('workday', 'rest_day', 'missing')
  ),
  biometric_time_in time,
  biometric_time_out time,
  biometric_worked_seconds integer not null default 0 check (biometric_worked_seconds >= 0),
  break_seconds integer not null default 0 check (break_seconds >= 0),
  calculated_regular_seconds integer not null default 0 check (calculated_regular_seconds >= 0),
  detected_overtime_seconds integer not null default 0 check (detected_overtime_seconds >= 0),
  classification text not null check (classification in (
    'WORKED', 'NO_BIOMETRIC', 'ABSENT', 'REST_DAY', 'REGULAR_HOLIDAY',
    'SPECIAL_NON_WORKING_HOLIDAY', 'PAID_LEAVE', 'UNPAID_LEAVE',
    'OFFICIAL_BUSINESS', 'MANUAL_ATTENDANCE', 'FORGOT_TO_LOG',
    'COMPANY_PAID_DAY'
  )),
  approved_regular_seconds integer not null default 0 check (approved_regular_seconds >= 0),
  approved_overtime_seconds integer not null default 0 check (approved_overtime_seconds >= 0),
  overtime_status public.adjustment_status not null default 'pending',
  source text not null check (source in (
    'biometric', 'schedule', 'holiday', 'leave', 'manual', 'system'
  )),
  is_manual_override boolean not null default false,
  override_reason text,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (not is_manual_override or nullif(trim(override_reason), '') is not null)
);

create unique index if not exists employee_work_schedules_lookup_idx
  on public.employee_work_schedules(
    coalesce(employee_id::text, employee_name_key),
    coalesce(site_id::text, ''),
    day_of_week,
    coalesce(effective_from, date '1900-01-01')
  );
create unique index if not exists payroll_holidays_lookup_idx
  on public.payroll_holidays(holiday_date, coalesce(site_id::text, ''), holiday_type);
create index if not exists employee_leave_records_lookup_idx
  on public.employee_leave_records(employee_id, employee_name_key, leave_date, status);
create unique index if not exists payroll_attendance_days_run_employee_date_idx
  on public.payroll_attendance_days(payroll_run_item_id, attendance_date)
  where payroll_run_item_id is not null;
create index if not exists payroll_attendance_days_review_idx
  on public.payroll_attendance_days(payroll_run_id, employee_name_key, attendance_date);

drop trigger if exists employee_work_schedules_set_updated_at on public.employee_work_schedules;
create trigger employee_work_schedules_set_updated_at
  before update on public.employee_work_schedules
  for each row execute function public.set_updated_at();
drop trigger if exists payroll_holidays_set_updated_at on public.payroll_holidays;
create trigger payroll_holidays_set_updated_at
  before update on public.payroll_holidays
  for each row execute function public.set_updated_at();
drop trigger if exists employee_leave_records_set_updated_at on public.employee_leave_records;
create trigger employee_leave_records_set_updated_at
  before update on public.employee_leave_records
  for each row execute function public.set_updated_at();
drop trigger if exists payroll_attendance_days_set_updated_at on public.payroll_attendance_days;
create trigger payroll_attendance_days_set_updated_at
  before update on public.payroll_attendance_days
  for each row execute function public.set_updated_at();

alter table public.employee_work_schedules enable row level security;
alter table public.payroll_holidays enable row level security;
alter table public.employee_leave_records enable row level security;
alter table public.payroll_attendance_days enable row level security;

drop policy if exists "employee schedules readable by authenticated users" on public.employee_work_schedules;
create policy "employee schedules readable by authenticated users"
  on public.employee_work_schedules for select using (auth.role() = 'authenticated');
drop policy if exists "employee schedules managed by payroll managers and ceo" on public.employee_work_schedules;
create policy "employee schedules managed by payroll managers and ceo"
  on public.employee_work_schedules for all
  using (public.is_ceo() or public.is_payroll_manager())
  with check (public.is_ceo() or public.is_payroll_manager());

drop policy if exists "payroll holidays readable by authenticated users" on public.payroll_holidays;
create policy "payroll holidays readable by authenticated users"
  on public.payroll_holidays for select using (auth.role() = 'authenticated');
drop policy if exists "payroll holidays managed by payroll managers and ceo" on public.payroll_holidays;
create policy "payroll holidays managed by payroll managers and ceo"
  on public.payroll_holidays for all
  using (public.is_ceo() or public.is_payroll_manager())
  with check (public.is_ceo() or public.is_payroll_manager());

drop policy if exists "leave records readable by authenticated users" on public.employee_leave_records;
create policy "leave records readable by authenticated users"
  on public.employee_leave_records for select using (auth.role() = 'authenticated');
drop policy if exists "leave records managed by payroll managers and ceo" on public.employee_leave_records;
create policy "leave records managed by payroll managers and ceo"
  on public.employee_leave_records for all
  using (public.is_ceo() or public.is_payroll_manager())
  with check (public.is_ceo() or public.is_payroll_manager());

drop policy if exists "payroll attendance days readable by authenticated users" on public.payroll_attendance_days;
create policy "payroll attendance days readable by authenticated users"
  on public.payroll_attendance_days for select using (auth.role() = 'authenticated');
drop policy if exists "payroll attendance days managed by payroll managers and ceo" on public.payroll_attendance_days;
create policy "payroll attendance days managed by payroll managers and ceo"
  on public.payroll_attendance_days for all
  using (public.is_ceo() or public.is_payroll_manager())
  with check (public.is_ceo() or public.is_payroll_manager());

notify pgrst, 'reload schema';
commit;
